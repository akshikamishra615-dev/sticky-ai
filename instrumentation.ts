import { prisma } from "@/lib/prisma";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log("[System] Running startup tasks...");

    // 1. Stuck Document Reconciliation
    try {
      // Keep 15-minute threshold to prevent race conditions during rolling deploys
      // where a new instance might otherwise fail an old instance's active jobs.
      const thresholdTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

      const updated = await prisma.document.updateMany({
        where: {
          status: {
            in: [
              "PROCESSING_DOCUMENT",
              "OCR_SCANNING",
              "GENERATING_EMBEDDINGS",
              "INDEXING"
            ]
          },
          updatedAt: {
            lt: thresholdTime
          }
        },
        data: {
          status: "FAILED",
          errorCode: "SERVER_RESTART",
          errorMessage: "Document processing timed out and was reset during a system restart."
        }
      });

      if (updated.count > 0) {
        console.log(`[System] Reconciled ${updated.count} stuck documents to FAILED state.`);
      } else {
        console.log(`[System] No stuck documents found.`);
      }
    } catch (error) {
      console.error("[System ERROR] Failed to run document reconciliation:", error);
    }
  }
}
