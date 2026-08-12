import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { queueProcessDocument } from "@/lib/server/rag";

const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

import { SUPPORTED_FORMATS } from "@/lib/shared/file-validation";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    let userId = session?.user?.id;
    
    // Fallback for local testing
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = "cmskafizo0000l1boh9jfy8wi";
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

    if (file.size > format.limit) {
      console.log("[KB Upload] validation: FAIL - file too large");
      return NextResponse.json({ success: false, error: { code: "FILE_TOO_LARGE", message: `File is too large. Maximum allowed size is ${format.limit / (1024 * 1024)} MB.` } }, { status: 400 });
    }

    const safeFilename = `${userId}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    const startUpload = performance.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log(`[KB PERF] file saved in ${Math.round(performance.now() - startUpload)} ms`);

    const document = await prisma.document.create({
      data: {
        userId,
        name: originalName,
        mimeType: file.type,
        size: file.size,
        status: "PROCESSING_DOCUMENT",
        sourceType: format.type,
        url: `/api/documents/${safeFilename}`
      }
    });

    console.log(`[KB PERF] document created`);

    // Process asynchronously through the global queue
    queueProcessDocument(document.id, filePath, userId).catch(err => {
      console.error("[KB ERROR] process background task failed to start:", err);
    });

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
