import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { wakeWorker } from "@/lib/server/rag";
import { rateLimiters, getIp, getRateLimitKey } from "@/lib/server/ratelimit";
import { uploadToS3, deleteFromS3 } from "@/lib/server/s3";
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

    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase() || "";

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
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate hash for duplicate detection
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const s3Key = `uploads/${userId}/${fileHash}.${ext}`;

    // Duplicate check
    const existingDoc = await prisma.document.findFirst({
      where: {
        userId,
        url: s3Key,
        status: { not: "FAILED" }
      }
    });

    if (existingDoc) {
      return NextResponse.json({ success: false, error: { code: "DUPLICATE_FILE", message: "This exact document has already been uploaded." } }, { status: 400 });
    }

    // 1. Upload to S3
    try {
      await uploadToS3(s3Key, buffer, file.type);
    } catch (error) {
      console.error("[KB ERROR] Failed to upload file to S3:", error);
      return NextResponse.json({ success: false, error: { code: "STORAGE_ERROR", message: "Failed to upload file to storage." } }, { status: 500 });
    }

    console.log(`[KB PERF] file uploaded to S3 in ${Math.round(performance.now() - startUpload)} ms`);

    // 2. Create DB record
    try {
      const document = await prisma.document.create({
        data: {
          userId,
          name: originalName,
          mimeType: file.type,
          size: file.size,
          status: "QUEUED",
          sourceType: format.type,
          url: s3Key
        }
      });

      try {
        wakeWorker();
      } catch (err: unknown) {
        const errorObj = err as { code?: string };
        if (errorObj?.code === "SERVER_SHUTTING_DOWN") {
          await prisma.document.delete({ where: { id: document.id } });
          await deleteFromS3(s3Key).catch(e => console.error("[KB ERROR] Cleanup failed:", e));
          return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "The server is temporarily unavailable." } }, { status: 503 });
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
      console.error("[KB ERROR] Failed to create document record:", error);
      await deleteFromS3(s3Key).catch(e => console.error("[KB ERROR] Orphaned S3 object cleanup failed:", e));
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to save document record." } }, { status: 500 });
    }
  } catch (error) {
    console.error("[KB] Upload error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "The server could not process the upload. Please try again." } }, { status: 500 });
  }
}
