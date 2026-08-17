import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { wakeWorker } from "@/lib/server/rag";

const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }
    const userId = session.user.id;

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

    if (!document.url) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "Document URL is missing." } }, { status: 400 });
    }

    // Verify physical file exists
    const filename = document.url.split('/').pop();
    if (!filename) {
      return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: "Invalid document URL." } }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "The original PDF is no longer available. Please re-upload it." } }, { status: 400 });
    }

    // Reset status to PROCESSING_DOCUMENT using an atomic condition
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
