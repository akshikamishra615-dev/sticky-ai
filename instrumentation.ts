import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

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

    // 2. Orphan File Sweeper
    try {
      const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");

      if (fs.existsSync(UPLOAD_DIR)) {
        const files = fs.readdirSync(UPLOAD_DIR);
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        // Fetch all currently referenced document URLs from the database
        const referencedDocs = await prisma.document.findMany({
          select: { url: true },
          where: { url: { not: null } }
        });

        // Build a Set of referenced physical filenames
        const referencedFilenames = new Set(
          referencedDocs
            .map(d => d.url?.split('/').pop())
            .filter(Boolean)
        );

        for (const file of files) {
          // Prevent directory traversal or deleting non-upload files
          if (file === "." || file === ".." || file.startsWith(".")) continue;

          // CRITICAL: If the file is referenced by ANY document in the database
          // (e.g. a FAILED document needing retry), DO NOT delete it.
          if (referencedFilenames.has(file)) {
            continue;
          }

          const filePath = path.join(UPLOAD_DIR, file);

          try {
            // Do not follow symlinks
            const stats = fs.lstatSync(filePath);

            if (stats.isFile()) {
              if (now - stats.mtimeMs > TWENTY_FOUR_HOURS) {
                fs.unlinkSync(filePath);
                deletedCount++;
              }
            }
          } catch (statErr) {
            console.error(`[System ERROR] Failed to stat or unlink file ${file}:`, statErr);
          }
        }
        if (deletedCount > 0) {
          console.log(`[System] Swept ${deletedCount} truly orphaned files from uploads directory.`);
        }
      }
    } catch (error) {
      console.error("[System ERROR] Failed to run orphan file sweeper:", error);
    }
  }
}
