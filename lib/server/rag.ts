"use server"

import { prisma } from "@/lib/prisma";
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

// Global processing queue (concurrency = 1)
const processingQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

async function processNext() {
  if (isProcessing || processingQueue.length === 0) return;
  isProcessing = true;
  const task = processingQueue.shift();
  if (task) {
    try {
      await task();
    } catch (err) {
      console.error("[KB ERROR] processNext task threw:", err);
    } finally {
      isProcessing = false;
      // Yield to event loop to allow other tasks to breathe before picking up next
      setTimeout(processNext, 10);
    }
  }
}

export async function queueProcessDocument(documentId: string, filePath: string, userId: string) {
  processingQueue.push(() => processDocument(documentId, filePath, userId));
  setTimeout(() => {
    processNext().catch(err => console.error("[KB ERROR] unhandled processNext error:", err));
  }, 0);
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

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING_DOCUMENT" }
    });
    
    // 1. Read file buffer
    const buffer = fs.readFileSync(filePath);
    
    const filename = filePath.split(/[/\\]/).pop() || "";
    
    // 2. Extract text & metadata using central parser
    console.log(`[KB PERF] parser started`);
    const parserStart = performance.now();
    
    const onOcrScanning = async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "OCR_SCANNING" } // Temporarily show OCR scanning
      });
    };
    
    const parsedChunks = await parseDocumentFile(buffer, doc.mimeType, filename, onOcrScanning);
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
    } catch (error: any) {
      console.error("[INDEX DIAGNOSTIC] error type:", typeof error);
      console.error("[INDEX DIAGNOSTIC] error name:", error?.constructor?.name);
      console.error("[INDEX DIAGNOSTIC] error:", error);
      console.error("[INDEX DIAGNOSTIC] message:", error?.message);
      console.error("[INDEX DIAGNOSTIC] stack:", error?.stack);
      console.error("[INDEX DIAGNOSTIC] error.code:", error?.code);
      console.error("[INDEX DIAGNOSTIC] error.meta:", error?.meta);
      console.error("[INDEX DIAGNOSTIC] error.cause:", error?.cause);
      console.error("[INDEX DIAGNOSTIC] documentId:", documentId);
      console.error("[INDEX DIAGNOSTIC] chunks count:", embeddedChunks.length);
      console.error("[INDEX DIAGNOSTIC] current chunkIndex:", chunkIndex);
      console.error("[INDEX DIAGNOSTIC] vector dimension:", embeddedChunks[chunkIndex]?.vector?.length);
      console.error("[INDEX DIAGNOSTIC] operation:", 'INSERT INTO "DocumentChunk"');
      throw { code: "VECTOR_INDEXING_FAILURE", message: "We couldn't index this document. Please try again." };
    }

    console.log(`[KB PERF] indexing finished: ${Math.round(performance.now() - insertStart)} ms`);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" }
    });

    console.log(`[KB PERF] document READY`);
    console.log(`[KB] Total processing time: ${Math.round(performance.now() - startProcessing)}ms`);

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
  } finally {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[KB DEBUG] Cleaned up temporary file: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error("[KB ERROR] Failed to clean up temporary file:", cleanupError);
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

export async function searchKnowledgeBase(query: string, userId: string) {
  const extractor = await getExtractor();
  const output = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw`
    SELECT 
      c.id, 
      c.content, 
      c.metadata,
      d.name as "documentName"
    FROM "DocumentChunk" c
    JOIN "Document" d ON c."documentId" = d.id
    WHERE c."userId" = ${userId}
    ORDER BY c.embedding <=> ${vectorString}::vector
    LIMIT 4;
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results as { id: string; content: string; metadata: any; documentName: string }[];
}
