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

export async function parsePDF(buffer: Buffer, onOcrScanning?: () => Promise<void>): Promise<ParsedChunk[]> {
  const pdfModule = await import("pdf-parse");
  const pdf = pdfModule.default || pdfModule;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfData = await (pdf as any)(buffer);
  
  const text = pdfData.text?.trim() || "";
  
  // If we found meaningful text (e.g., more than 50 chars), it's a normal PDF
  if (text.length > 50) {
    return [{
      text: text,
      metadata: { pages: pdfData.numpages }
    }];
  }

  // FALLBACK: OCR for scanned PDF
  console.log(`[KB PERF] PDF text too short (${text.length} chars). Falling back to OCR...`);
  
  if (onOcrScanning) {
    await onOcrScanning();
  }

  const uint8Array = new Uint8Array(buffer);
  const pdfDoc = await pdfjs.getDocument({ data: uint8Array }).promise;
  const numPages = pdfDoc.numPages;
  const chunks: ParsedChunk[] = [];
  
  const worker = await getWorker();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const ops = await page.getOperatorList();
    
    for (let j = 0; j < ops.fnArray.length; j++) {
      let tesseractInput: Buffer | null = null;

      if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
        const objId = ops.argsArray[j][0];
        const img = await page.objs.get(objId);
        if (img && img.data) {
          let data = img.data;
          if (img.kind === 2) { // Convert RGB to RGBA
             const rgba = new Uint8Array(img.width * img.height * 4);
             for (let k = 0, l = 0; k < img.data.length; k+=3, l+=4) {
                 rgba[l] = img.data[k];
                 rgba[l+1] = img.data[k+1];
                 rgba[l+2] = img.data[k+2];
                 rgba[l+3] = 255;
             }
             data = rgba;
          }
          tesseractInput = Buffer.from(encode({ width: img.width, height: img.height, data }));
        }
      // @ts-expect-error - TS types are outdated for pdfjs-dist OPS
      } else if (ops.fnArray[j] === pdfjs.OPS.paintJpegXObject) {
        const objId = ops.argsArray[j][0];
        const img = await page.objs.get(objId);
        if (img && img.data) {
          tesseractInput = Buffer.from(img.data);
        }
      }

      if (tesseractInput) {
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
    }
  }

  if (chunks.length === 0) {
    throw { code: "SCANNED_PDF_WITH_NO_TEXT", message: "No readable text could be extracted from this scanned document." };
  }

  return chunks;
}
