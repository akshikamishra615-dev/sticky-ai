"use server"

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { parseDocumentFile } from "./parsers";

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Global pipeline instance promise
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;
async function getExtractor() {
  if (!extractorPromise) {
    const start = performance.now();
    console.log(`[KB PERF] loading Xenova model`);
    extractorPromise = pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
      quantized: true,
    }).then(pipe => {
      console.log(`[KB PERF] Xenova model ready: ${Math.round(performance.now() - start)} ms`);
      return pipe;
    }).catch(err => {
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

// Global processing queue state (concurrency = 1)
let isProcessing = false;
let isShuttingDown = false;

// Graceful shutdown mitigation
if (typeof process !== "undefined") {
  process.on('SIGTERM', () => {
    console.log("[System] SIGTERM received. Stopping document processing queue.");
    isShuttingDown = true;
  });

  // Periodic lightweight polling worker
  setInterval(() => {
    if (!isShuttingDown && !isProcessing) {
      processNext().catch(() => {});
    }
  }, 10000);
}

export async function wakeWorker() {
  if (isShuttingDown) {
    throw { code: "SERVER_SHUTTING_DOWN", message: "Server is shutting down, cannot accept new background jobs." };
  }
  if (!isProcessing) {
    setTimeout(() => {
      processNext().catch(err => console.error("[KB ERROR] unhandled processNext error:", err));
    }, 0);
  }
}

async function processNext() {
  if (isShuttingDown) return;
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    const doc = await prisma.document.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" }
    });

    if (doc) {
      // Atomic lock
      const locked = await prisma.document.updateMany({
        where: { id: doc.id, status: "QUEUED" },
        data: { status: "PROCESSING_DOCUMENT" }
      });

      if (locked.count === 1) {
        if (!doc.url) {
          throw new Error("Document URL is missing.");
        }
        
        const filename = doc.url.split('/').pop();
        const filePath = filename ? path.join(UPLOAD_DIR, filename) : "";
        
        if (!filePath || !fs.existsSync(filePath)) {
           await prisma.document.update({
             where: { id: doc.id },
             data: { status: "FAILED", errorCode: "MISSING_FILE", errorMessage: "File lost during server restart, please re-upload." }
           });
        } else {
           await processDocument(doc.id, filePath, doc.userId);
        }
      }
    }
  } catch (error) {
    console.error("[KB ERROR] processNext task threw:", error);
  } finally {
    isProcessing = false;
  }
  
  if (!isShuttingDown) {
    // Check if more jobs exist
    const hasMore = await prisma.document.findFirst({ where: { status: "QUEUED" }, select: { id: true } });
    if (hasMore) {
      setTimeout(() => {
        processNext().catch(err => console.error("[KB ERROR] unhandled processNext loop error:", err));
      }, 0);
    }
  }
}

async function processDocument(documentId: string, filePath: string, userId: string) {
  const startProcessing = performance.now();
  console.log(`[KB PERF] processing started`);

  try {
    console.log(`[KB DEBUG] file exists: ${fs.existsSync(filePath)}`);
    if (!fs.existsSync(filePath)) {
      throw { code: "MISSING_FILE", message: "The uploaded file could not be found on the server." };
    }

    const stats = fs.statSync(filePath);
    console.log(`[KB DEBUG] file size: ${stats.size}`);

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw { code: "MISSING_DOCUMENT", message: "Document record not found in database." };

    // 1. Read file buffer
    const buffer = fs.readFileSync(filePath);

    const filename = filePath.split(/[/\\]/).pop() || "";

    // 2. Extract text & metadata using central parser
    console.log(`[KB PERF] parser started`);
    console.log(`[MEMORY] RSS before parsing: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    const parserStart = performance.now();

    const onOcrScanning = async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "OCR_SCANNING" } // Temporarily show OCR scanning
      });
    };

    const parsedChunks = await parseDocumentFile(buffer, doc.mimeType, filename, onOcrScanning);
    console.log(`[MEMORY] RSS after parsing: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    console.log(`[KB PERF] parser finished: ${Math.round(performance.now() - parserStart)} ms`);

    // 3. Chunk text (respecting parser chunks)
    const chunkingStart = performance.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalChunks: { text: string; metadata: any }[] = [];

    for (const pc of parsedChunks) {
      const split = chunkText(pc.text, 1000, 200);
      for (const textChunk of split) {
        finalChunks.push({
          text: textChunk,
          metadata: pc.metadata || {}
        });
      }
    }
    console.log(`[KB PERF] chunking finished: ${Math.round(performance.now() - chunkingStart)} ms`);

    const totalExtractedLength = finalChunks.reduce((acc, c) => acc + c.text.length, 0);
    console.log(`[KB PERF] extracted text length: ${totalExtractedLength}`);
    console.log(`[KB PERF] chunk count: ${finalChunks.length}`);

    if (finalChunks.length === 0) {
      throw { code: "SCANNED_PDF_WITH_NO_TEXT", message: "No usable text chunks found in this document." };
    }

    const extractor = await getExtractor();

    console.log(`[KB PERF] embedding started`);
    console.log(`[MEMORY] RSS before embedding: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    const embeddingStart = performance.now();

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "GENERATING_EMBEDDINGS" }
    });

    // Batch inference settings
    const batchSize = 16;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const embeddedChunks: { documentId: string, content: string, metadata: any, vector: number[] }[] = [];

    try {
      for (let i = 0; i < finalChunks.length; i += batchSize) {
        const batch = finalChunks.slice(i, i + batchSize);
        const batchTexts = batch.map(b => b.text);
        const output = await extractor(batchTexts, { pooling: 'mean', normalize: true });
        const batchEmbeddings = output.tolist();

        for (let j = 0; j < batch.length; j++) {
          embeddedChunks.push({
            documentId,
            content: batch[j].text,
            metadata: batch[j].metadata,
            vector: batchEmbeddings[j]
          });
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("[KB ERROR] stage: Embedding");
      console.error("[KB ERROR] name:", e?.name);
      console.error("[KB ERROR] message:", e?.message);
      console.error("[KB ERROR] stack:", e?.stack);
      throw { code: "EMBEDDING_FAILURE", message: "We couldn't generate the AI embeddings. Please try again." };
    }

    console.log(`[MEMORY] RSS after embedding: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    console.log(`[KB PERF] embedding finished: ${Math.round(performance.now() - embeddingStart)} ms`);

    console.log(`[KB PERF] indexing started`);
    const insertStart = performance.now();

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "INDEXING" }
    });

    try {
      // 5. Index into pgvector
      let chunkIndex = 0;
      for (const chunk of embeddedChunks) {
        const vectorString = `[${chunk.vector.join(',')}]`;
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "userId", "content", "metadata", "embedding", "createdAt", "chunkIndex")
          VALUES (
            gen_random_uuid(),
            ${chunk.documentId},
            ${userId},
            ${chunk.content},
            ${chunk.metadata ? JSON.stringify(chunk.metadata) : null}::jsonb,
            ${vectorString}::vector,
            NOW(),
            ${chunkIndex}
          )
        `;
        chunkIndex++;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("[KB ERROR] stage: Indexing");
      console.error("[KB ERROR] name:", e?.name);
      console.error("[KB ERROR] message:", e?.message);
      console.error("[KB ERROR] stack:", e?.stack);
      throw { code: "VECTOR_INDEXING_FAILURE", message: "We couldn't index this document. Please try again." };
    }

    console.log(`[KB PERF] indexing finished: ${Math.round(performance.now() - insertStart)} ms`);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" }
    });

    console.log(`[KB PERF] document READY`);
    console.log(`[KB] Total processing time: ${Math.round(performance.now() - startProcessing)}ms`);

    // Clean up temporary file ONLY on success
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[KB DEBUG] Cleaned up temporary file: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error("[KB ERROR] Failed to clean up temporary file:", cleanupError);
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[KB ERROR] stage: ProcessDocument Catch");
    console.error("[KB ERROR] name:", error?.name || error?.code);
    console.error("[KB ERROR] message:", error?.message);
    console.error("[KB ERROR] stack:", error?.stack);

    const errorCode = error?.code || "UNKNOWN_PROCESSING_ERROR";
    const errorMessage = error?.message || "We couldn't process this document. Please try again.";

    try {
      // Cleanup partial chunks on failure
      await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${documentId} AND "userId" = ${userId}`;

      await prisma.document.update({
        where: { id: documentId },
        data: { status: "FAILED", errorCode, errorMessage }
      });
    } catch (e) {
      console.error("[KB ERROR] Fallback update failed:", e);
    }
  }
}

function chunkText(text: string, maxChunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxChunkSize, text.length);
    let chunk = text.slice(i, end);

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunk.length - overlap && breakPoint > 0) {
        end = i + breakPoint + 1;
        chunk = text.slice(i, end);
      }
    }

    const cleanChunk = chunk.trim();
    if (cleanChunk.length >= 10) {
      chunks.push(cleanChunk);
    }

    i = end - overlap;
    if (i <= 0 || end === text.length) break;
  }
  return chunks;
}

export async function getDocuments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      status: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!document || document.userId !== userId) {
    throw new Error("Document not found or unauthorized");
  }

  // Delete from DB (cascades to chunks/vectors safely due to schema)
  await prisma.document.deleteMany({
    where: { id: documentId, userId }
  });

  // Try physical deletion
  try {
    if (document.url) {
      const filename = document.url.split('/').pop();
      if (filename) {
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
  } catch (e) {
    console.error("File cleanup failed:", e);
  }

  return true;
}

const COSINE_DISTANCE_THRESHOLD = 0.7;

export async function searchKnowledgeBase(query: string, userId: string, documentIds?: string[]) {
  const extractor = await getExtractor();
  const output = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // 1. Primary Vector Retrieval (Top 8)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let primaryResults: any[];

  if (documentIds !== undefined) {
    if (documentIds.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primaryResults = await prisma.$queryRaw<any[]>`
      SELECT
        c.id,
        c.content,
        c.metadata,
        c."documentId",
        c."chunkIndex",
        (c.embedding <=> ${vectorString}::vector) as distance,
        d.name as "documentName"
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c."userId" = ${userId}
        AND d.status = 'READY'
        AND d.id IN (${Prisma.join(documentIds)})
        AND c.embedding <=> ${vectorString}::vector < ${COSINE_DISTANCE_THRESHOLD}
      ORDER BY c.embedding <=> ${vectorString}::vector ASC
      LIMIT 8;
    `;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primaryResults = await prisma.$queryRaw<any[]>`
      SELECT
        c.id,
        c.content,
        c.metadata,
        c."documentId",
        c."chunkIndex",
        (c.embedding <=> ${vectorString}::vector) as distance,
        d.name as "documentName"
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c."userId" = ${userId}
        AND d.status = 'READY'
        AND c.embedding <=> ${vectorString}::vector < ${COSINE_DISTANCE_THRESHOLD}
      ORDER BY c.embedding <=> ${vectorString}::vector ASC
      LIMIT 8;
    `;
  }

  if (primaryResults.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalChunks = new Map<string, any>();
  const docBestDistance = new Map<string, number>();

  // Add primary results and track best distance per document
  for (const row of primaryResults) {
    const key = `${row.documentId}-${row.chunkIndex}`;
    finalChunks.set(key, row);

    if (!docBestDistance.has(row.documentId) || row.distance < docBestDistance.get(row.documentId)!) {
      docBestDistance.set(row.documentId, row.distance);
    }
  }

  // 2. Neighboring Chunk Expansion
  // Conservative rule: only expand if primary match is very strong (< 0.45)
  // Hard maximum context size: 15 chunks (~15,000 chars / ~3,500 tokens)
  const MAX_FINAL_CHUNKS = 15;

  const neighborQueries: { documentId: string, chunkIndex: number }[] = [];

  for (const row of primaryResults) {
    if (row.distance < 0.45) {
      neighborQueries.push({ documentId: row.documentId, chunkIndex: row.chunkIndex - 1 });
      neighborQueries.push({ documentId: row.documentId, chunkIndex: row.chunkIndex + 1 });
    }
  }

  if (neighborQueries.length > 0) {
    const neighbors = await prisma.documentChunk.findMany({
      where: { OR: neighborQueries },
      include: { document: { select: { name: true } } }
    });

    // We do not guarantee strict sequential insertion of neighbors here,
    // but the final sort (3. Sort for LLM) will correct the ordering.
    for (const n of neighbors) {
      if (finalChunks.size >= MAX_FINAL_CHUNKS) break;

      const key = `${n.documentId}-${n.chunkIndex}`;
      if (!finalChunks.has(key)) {
        finalChunks.set(key, {
          id: n.id,
          content: n.content,
          metadata: n.metadata,
          documentId: n.documentId,
          chunkIndex: n.chunkIndex,
          documentName: n.document.name
        });
      }
    }
  }

  // 3. Sort for LLM
  // Group by Document's best primary distance, then sort sequentially by chunkIndex
  // This ensures the LLM reads continuous adjacent paragraphs naturally without jumping around.
  const resultsArray = Array.from(finalChunks.values());
  resultsArray.sort((a, b) => {
    if (a.documentId !== b.documentId) {
      return (docBestDistance.get(a.documentId) || 1) - (docBestDistance.get(b.documentId) || 1);
    }
    return a.chunkIndex - b.chunkIndex;
  });

  return resultsArray.map(r => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    documentId: r.documentId,
    documentName: r.documentName,
    distance: r.distance
  }));
}
