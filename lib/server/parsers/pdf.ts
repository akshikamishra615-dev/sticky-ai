import { ParsedChunk } from "./types";
import { encode } from 'fast-png';
import { createWorker, Worker } from "tesseract.js";
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      console.log("[IMAGE PERF] initializing Tesseract worker for PDF");
      const start = performance.now();
      const workerPath = path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js');
      const w = await createWorker(['eng', 'hin'], 1, { workerPath });
      console.log(`[IMAGE PERF] Tesseract worker ready in ${Math.round(performance.now() - start)} ms`);
      return w;
    })();
  }
  return workerPromise;
}

const MAX_OCR_PAGES = 10;

export async function parsePDF(buffer: Buffer, onOcrScanning?: () => Promise<void>): Promise<ParsedChunk[]> {
  const pdfModule = await import("pdf-parse");
  const pdf = pdfModule.default || pdfModule;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfData: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfData = await (pdf as any)(buffer);
  } catch (err) {
    console.warn("[KB] pdf-parse failed, will attempt OCR fallback if possible.", err);
  }
  
  const text = pdfData?.text?.trim() || "";
  
  // If we found meaningful text (e.g., more than 50 chars), it's a normal PDF
  if (text.length > 50) {
    // Help GC clear the huge pdfData object early
    const pages = pdfData.numpages;
    pdfData = null; 
    return [{
      text: text,
      metadata: { pages }
    }];
  }

  // Clear pdfData from memory before starting OCR
  pdfData = null;

  // FALLBACK: OCR for scanned PDF
  console.log(`[KB PERF] PDF text too short (${text.length} chars). Falling back to OCR...`);
  
  if (onOcrScanning) {
    await onOcrScanning();
  }

  const uint8Array = new Uint8Array(buffer);
  const pdfDoc = await pdfjs.getDocument({ data: uint8Array }).promise;
  
  try {
    const numPages = pdfDoc.numPages;
    
    if (numPages > MAX_OCR_PAGES) {
      throw { 
        code: "OCR_PAGE_LIMIT_EXCEEDED", 
        message: `This scanned document has ${numPages} pages, which exceeds the maximum OCR limit of ${MAX_OCR_PAGES} pages. Please upload a smaller document or a text-based PDF.` 
      };
    }

    const chunks: ParsedChunk[] = [];
    const worker = await getWorker();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      
      try {
        const ops = await page.getOperatorList();
        
        for (let j = 0; j < ops.fnArray.length; j++) {
          let tesseractInput: Buffer | null = null;
          let imgData: Uint8Array | null = null;
          let rgba: Uint8Array | null = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let img: any = null;

          try {
            if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
              const objId = ops.argsArray[j][0];
              img = await page.objs.get(objId);
              if (img && img.data) {
                imgData = img.data;
                if (img.kind === 2 && imgData) { // Convert RGB to RGBA
                   rgba = new Uint8Array(img.width * img.height * 4);
                   for (let k = 0, l = 0; k < imgData.length; k+=3, l+=4) {
                       rgba[l] = imgData[k];
                       rgba[l+1] = imgData[k+1];
                       rgba[l+2] = imgData[k+2];
                       rgba[l+3] = 255;
                   }
                   imgData = rgba;
                }
                if (imgData) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  tesseractInput = Buffer.from(encode({ width: img.width, height: img.height, data: imgData as any }));
                }
              }
            // @ts-expect-error - TS types are outdated for pdfjs-dist OPS
            } else if (ops.fnArray[j] === pdfjs.OPS.paintJpegXObject) {
              const objId = ops.argsArray[j][0];
              img = await page.objs.get(objId);
              if (img && img.data) {
                tesseractInput = Buffer.from(img.data);
              }
            }

            if (tesseractInput) {
              console.log(`[IMAGE PERF] PDF Page ${i} starting OCR on image...`);
              const ocrStart = performance.now();
              const res = await worker.recognize(tesseractInput);
              console.log(`[IMAGE PERF] PDF Page ${i} OCR finished: ${Math.round(performance.now() - ocrStart)} ms`);
              
              const extracted = res.data.text.trim();
              if (extracted.length > 0) {
                chunks.push({
                  text: extracted,
                  metadata: {
                    sourceType: "PDF",
                    pageNumber: i,
                    extractionMethod: "OCR"
                  }
                });
              }
            }
          } finally {
            // Nullify large buffers immediately after processing the image
            tesseractInput = null;
            imgData = null;
            rgba = null;
            img = null;
          }
        }
      } finally {
        // MUST clean up page memory to avoid OOM
        page.cleanup();
      }
    }

    if (chunks.length === 0) {
      throw { code: "SCANNED_PDF_WITH_NO_TEXT", message: "No readable text could be extracted from this scanned document." };
    }

    return chunks;
  } finally {
    // MUST destroy document to release unmanaged memory
    try {
      await pdfDoc.destroy();
    } catch (e) {
      console.error("[KB ERROR] Failed to destroy pdfDoc:", e);
    }
  }
}
