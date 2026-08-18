"use server"

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import os from "os";
import { pipeline } from "@xenova/transformers";
import { parseDocumentFile } from "./parsers";
import { downloadFromS3ToTempFile, checkS3ObjectExists, deleteFromS3 } from "./s3";

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
        
        const s3Exists = await checkS3ObjectExists(doc.url);
        
        if (!s3Exists) {
           await prisma.document.update({
             where: { id: doc.id },
             data: { status: "FAILED", errorCode: "MISSING_FILE", errorMessage: "File lost during server restart, please re-upload." }
           });
        } else {
           await processDocument(doc.id, doc.url, doc.userId);
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

async function processDocument(documentId: string, s3Key: string, userId: string) {
  const startProcessing = performance.now();
  console.log(`[KB PERF] processing started`);
  let tmpPath: string | null = null;

  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw { code: "MISSING_DOCUMENT", message: "Document record not found in database." };

    // 1. Download to temporary file
    tmpPath = path.join(os.tmpdir(), `${documentId}.tmp`);
    await downloadFromS3ToTempFile(s3Key, tmpPath);
    
    // Read file buffer
    const buffer = fs.readFileSync(tmpPath);
    const filename = s3Key.split(/[/\\]/).pop() || "";

    // 2. Extract text & metadata using central parser
    console.log(`[KB PERF] parser started`);
    console.log(`[MEMORY] RSS before parsing: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    const parserStart = performance.now();

    const onOcrScanning = async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "OCR_SCANNING" }
      });
    };

    const parsedChunks = await parseDocumentFile(buffer, doc.mimeType, filename, onOcrScanning);
    console.log(`[MEMORY] RSS after parsing: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    console.log(`[KB PERF] parser finished: ${Math.round(performance.now() - parserStart)} ms`);

    // 3. Chunk text
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

    if (finalChunks.length === 0) {
      throw { code: "SCANNED_PDF_WITH_NO_TEXT", message: "No usable text chunks found in this document." };
    }

    const extractor = await getExtractor();

    console.log(`[KB PERF] embedding started`);
    const embeddingStart = performance.now();

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "GENERATING_EMBEDDINGS" }
    });

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
    } catch (e: unknown) {
      console.error("[KB ERROR] stage: Embedding", e);
      throw { code: "EMBEDDING_FAILURE", message: "We couldn't generate the AI embeddings. Please try again." };
    }

    console.log(`[KB PERF] embedding finished: ${Math.round(performance.now() - embeddingStart)} ms`);

    console.log(`[KB PERF] indexing started`);
    const insertStart = performance.now();

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "INDEXING" }
    });

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

    console.log(`[KB PERF] indexing finished: ${Math.round(performance.now() - insertStart)} ms`);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" }
    });

    console.log(`[KB] Total processing time: ${Math.round(performance.now() - startProcessing)}ms`);
    
    // Cleanup S3 object only on absolute success
    await deleteFromS3(s3Key).catch(err => {
      console.error("[KB ERROR] Failed to delete S3 object after processing:", err);
    });

  } catch (error: unknown) {
    console.error("[KB ERROR] stage: ProcessDocument Catch", error);

    const errObj = error as { code?: string; message?: string };
    const errorCode = errObj?.code || "UNKNOWN_PROCESSING_ERROR";
    const errorMessage = errObj?.message || "We couldn't process this document. Please try again.";

    try {
      await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${documentId} AND "userId" = ${userId}`;
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "FAILED", errorCode, errorMessage }
      });
    } catch (e) {
      console.error("[KB ERROR] Fallback update failed:", e);
    }
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (e) {
        console.error(`[KB ERROR] Failed to clean up tmp file: ${tmpPath}`, e);
      }
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

export async function getDocuments(options?: { page?: number; q?: string; status?: string; pageSize?: number }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 12;
  const skip = (page - 1) * pageSize;
  const q = options?.q?.trim();
  const status = options?.status;

  const where: Prisma.DocumentWhereInput = {
    userId: session.user.id
  };

  if (q) {
    where.name = {
      contains: q,
      mode: 'insensitive'
    };
  }

  if (status && status !== 'ALL') {
    if (status === 'PROCESSING') {
      where.status = {
        in: ['QUEUED', 'PROCESSING_DOCUMENT', 'OCR_SCANNING', 'GENERATING_EMBEDDINGS', 'INDEXING', 'PROCESSING_PDF', 'UPLOADING']
      };
    } else {
      where.status = status;
    }
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
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
    }),
    prisma.document.count({ where })
  ]);

  return {
    documents,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const document = await prisma.document.findUnique({
    where: { id: documentId, userId }
  });

  if (!document) {
    throw new Error("Document not found or unauthorized");
  }

  // Delete from S3
  if (document.url) {
    try {
      await deleteFromS3(document.url);
    } catch (e) {
      console.error("[KB ERROR] Failed to delete S3 object during deleteDocument:", e);
      throw new Error("Failed to delete the document from storage. Please try again later.");
    }
  }

  await prisma.document.delete({
    where: { id: documentId }
  });

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

export async function checkDocumentStatus(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doc = await prisma.document.findUnique({
    where: {
      id: documentId,
      userId: session.user.id
    },
    select: {
      id: true,
      status: true,
      name: true
    }
  });

  return doc;
}
