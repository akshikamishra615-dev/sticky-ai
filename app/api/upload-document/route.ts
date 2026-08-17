import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { wakeWorker } from "@/lib/server/rag";
import { rateLimiters, getIp, getRateLimitKey } from "@/lib/server/ratelimit";

const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

import { SUPPORTED_FORMATS } from "@/lib/shared/file-validation";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const ip = getIp(req);
    const rateLimitKey = getRateLimitKey(ip, userId);
    const { success } = await rateLimiters.upload.limit(rateLimitKey);
    if (!success) {
      return NextResponse.json({ success: false, error: { code: "TOO_MANY_REQUESTS", message: "Upload limit exceeded. Please try again later." } }, { status: 429 });
    }

    // Fast fail for excessively large requests (e.g. > 25MB total body) before parsing formData
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Request payload too large." } }, { status: 413 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "You must be logged in to upload documents." } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("[KB Upload] validation: FAIL - no file");
      return NextResponse.json({ success: false, error: { code: "EMPTY_FILE", message: "No file was uploaded." } }, { status: 400 });
    }

    if (file.size === 0) {
      console.log("[KB Upload] validation: FAIL - empty file");
      return NextResponse.json({ success: false, error: { code: "EMPTY_FILE", message: "This file appears to be empty." } }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    if (isImage) console.log(`[IMAGE PERF] upload request started`);
    console.log(`[KB PERF] upload received`);

    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase() || "";

    console.log("[KB Upload] received:", {
      filename: originalName,
      size: file.size,
      mime: file.type,
      extension: ext
    });

    const format = SUPPORTED_FORMATS.find(f => f.ext === ext);

    if (!format) {
      console.log("[KB Upload] validation: FAIL - unsupported extension", ext);
      return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported file type." } }, { status: 400 });
    }

    if (file.type && file.type !== format.mime) {
      console.log("[KB Upload] validation: FAIL - MIME type mismatch");
      return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "MIME type mismatch." } }, { status: 400 });
    }

    if (file.size > format.limit) {
      console.log("[KB Upload] validation: FAIL - file too large");
      return NextResponse.json({ success: false, error: { code: "FILE_TOO_LARGE", message: `File is too large. Maximum allowed size is ${format.limit / (1024 * 1024)} MB.` } }, { status: 400 });
    }

    const startUpload = performance.now();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate SHA-256 hash of the file content for deduplication
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const safeFilename = `${userId}-${fileHash}.${ext}`;
    const fileUrl = `/api/documents/${safeFilename}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // Duplicate check: Prevent uploading the same exact file if it's already processing or ready
    const existingDoc = await prisma.document.findFirst({
      where: {
        userId,
        url: fileUrl,
        status: {
          not: "FAILED"
        }
      }
    });

    if (existingDoc) {
      console.log(`[KB Upload] duplicate file detected: ${safeFilename}`);
      return NextResponse.json({ success: false, error: { code: "DUPLICATE_FILE", message: "This exact document has already been uploaded." } }, { status: 400 });
    }

    if (ext === 'pdf') {
      if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
        console.log("[KB Upload] validation: FAIL - invalid PDF signature");
        return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Invalid PDF signature." } }, { status: 400 });
      }
    }

    // Use async file writing to prevent blocking the Node.js event loop
    await fsPromises.writeFile(filePath, buffer);

    console.log(`[KB PERF] file saved in ${Math.round(performance.now() - startUpload)} ms`);

    const document = await prisma.document.create({
      data: {
        userId,
        name: originalName,
        mimeType: file.type,
        size: file.size,
        status: "QUEUED",
        sourceType: format.type,
        url: fileUrl
      }
    });

    console.log(`[KB PERF] document created`);

    // Process asynchronously through the global queue
    try {
      wakeWorker();
    } catch (err: unknown) {
      const errorObj = err as { code?: string };
      if (errorObj?.code === "SERVER_SHUTTING_DOWN") {
        await prisma.document.delete({ where: { id: document.id } });
        if (fs.existsSync(filePath)) {
          await fsPromises.unlink(filePath);
        }
        return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "The server is temporarily unavailable while restarting. Please try again shortly." } }, { status: 503 });
      }
      console.error("[KB ERROR] process background task failed to start:", err);
    }

    return NextResponse.json({
      success: true,
      id: document.id,
      name: document.name,
      size: document.size,
      status: document.status,
      sourceType: document.sourceType,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  } catch (error) {
    console.error("[KB] Upload error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "The server could not process the upload. Please try again." } }, { status: 500 });
  }
}
