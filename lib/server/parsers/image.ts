import { ParsedChunk } from "./types";
import { createWorker, Worker } from "tesseract.js";

import path from "path";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      console.log("[IMAGE PERF] initializing Tesseract worker");
      const start = performance.now();
      const workerPath = path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js');
      const w = await createWorker(['eng', 'hin'], 1, {
        workerPath
      });
      console.log(`[IMAGE PERF] Tesseract worker ready in ${Math.round(performance.now() - start)} ms`);
      return w;
    })();
  }
  return workerPromise;
}

export async function parseImage(buffer: Buffer): Promise<ParsedChunk[]> {
  console.log("[IMAGE PERF] OCR started");
  const start = performance.now();
  
  try {
    const worker = await getWorker();
    const result = await worker.recognize(buffer);
    const text = result.data.text;
    
    console.log(`[IMAGE PERF] OCR finished: ${Math.round(performance.now() - start)} ms`);
    console.log(`[IMAGE PERF] extracted text length: ${text?.length || 0}`);
    
    if (!text || text.trim().length === 0) {
      throw { code: "NO_READABLE_TEXT", message: "No readable text could be extracted from this image." };
    }

    return [{ text }];
  } catch (error: unknown) {
    // @ts-expect-error type safety
    if (error?.code === "NO_READABLE_TEXT") throw error;
    console.error("[KB] Image OCR parser error:", error);
    throw { code: "OCR_FAILURE", message: "We couldn't read the text from this image." };
  }
}
