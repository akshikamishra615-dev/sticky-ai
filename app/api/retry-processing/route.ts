import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { wakeWorker } from "@/lib/server/rag";
import { checkS3ObjectExists } from "@/lib/server/s3";
import { rateLimiters, getIp, getRateLimitKey } from "@/lib/server/ratelimit";

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

    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json({ success: false, error: { code: "MISSING_DOCUMENT_ID", message: "Document ID is required." } }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document || document.userId !== userId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Document not found or unauthorized." } }, { status: 404 });
    }

    if (document.status !== "FAILED") {
      return NextResponse.json({ success: false, error: { code: "INVALID_STATUS", message: "Only FAILED documents can be retried" } }, { status: 400 });
    }

    if (!document.url) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "Document URL is missing." } }, { status: 400 });
    }

    // Verify file exists in S3
    const s3Exists = await checkS3ObjectExists(document.url);
    if (!s3Exists) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "The document file was lost. Please re-upload." } }, { status: 400 });
    }

    // Reset status to QUEUED using an atomic condition
    // Only transition if it's currently FAILED, preventing concurrent retries.
    const updateResult = await prisma.document.updateMany({
      where: { id: documentId, userId: userId, status: "FAILED" },
      data: { status: "QUEUED", errorCode: null, errorMessage: null }
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "Document is already processing or cannot be retried at this time." } }, { status: 409 });
    }

    // Clean existing chunks to ensure retry idempotency
    await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${documentId} AND "userId" = ${userId}`;

    // Enqueue for processing
    try {
      wakeWorker();
    } catch (err: unknown) {
      const errorObj = err as { code?: string };
      if (errorObj?.code === "SERVER_SHUTTING_DOWN") {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "FAILED", errorCode: "SERVICE_UNAVAILABLE", errorMessage: "The server is temporarily unavailable while restarting. Please try again shortly." }
        });
        return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "The server is temporarily unavailable while restarting. Please try again shortly." } }, { status: 503 });
      }
      console.error("[KB ERROR] process background task failed to start:", err);
    }

    return NextResponse.json({ success: true, status: "QUEUED" });
  } catch (error: unknown) {
    console.error("[KB] Retry API error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "The server could not process the retry. Please try again." } }, { status: 500 });
  }
}
