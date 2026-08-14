import { ParsedChunk } from "./types";
import { encode } from 'fast-png';
import { createWorker, Worker } from "tesseract.js";
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

const MAX_OCR_PAGES = 10;
const MAX_IMAGE_PIXELS = 3000 * 4000; // ~12 million pixels max (roughly 300dpi letter)

export async function parsePDF(buffer: Buffer, onOcrScanning?: () => Promise<void>): Promise<ParsedChunk[]> {
  const uint8Array = new Uint8Array(buffer);
  const pdfDoc = await pdfjs.getDocument({ data: uint8Array }).promise;
  
  let worker: Worker | null = null;
  
  try {
    const numPages = pdfDoc.numPages;
    const chunks: ParsedChunk[] = [];
    let ocrPageCount = 0;
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      
      try {
        const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = textContent.items.map((item: any) => item.str).join(" ").trim();
        
        if (pageText.length > 50) {
          chunks.push({
            text: pageText,
            metadata: {
              sourceType: "PDF",
              pageNumber: i,
              extractionMethod: "TEXT"
            }
          });
          continue;
        }

        // --- PAGE REQUIRES OCR ---
        ocrPageCount++;
        if (ocrPageCount > MAX_OCR_PAGES) {
          throw { 
            code: "OCR_PAGE_LIMIT_EXCEEDED", 
            message: `This document contains more than ${MAX_OCR_PAGES} scanned pages, which exceeds the maximum OCR limit. Please upload a text-based PDF or a smaller scanned document.` 
          };
        }

        console.log(`[KB PERF] PDF Page ${i} has insufficient text (${pageText.length} chars). Falling back to OCR...`);
        
        if (onOcrScanning && ocrPageCount === 1) {
          await onOcrScanning();
        }

        if (!worker) {
          console.log("[IMAGE PERF] initializing local Tesseract worker for PDF");
          const workerStart = performance.now();
          const workerPath = path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js');
          worker = await createWorker(['eng', 'hin'], 1, { workerPath });
          console.log(`[IMAGE PERF] Tesseract worker ready in ${Math.round(performance.now() - workerStart)} ms`);
        }

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
              try {
                img = await page.objs.get(objId);
              } catch (e) {
                if (typeof objId === 'string' && objId.startsWith('g_')) {
                  img = await page.commonObjs.get(objId);
                } else {
                  throw e;
                }
              }
              if (img && img.data) {
                const numPixels = img.width * img.height;
                if (numPixels > MAX_IMAGE_PIXELS) {
                  throw {
                    code: "IMAGE_RESOLUTION_TOO_HIGH",
                    message: `Page ${i} contains an image that is too large to process (${img.width}x${img.height} pixels). Please reduce the scanning resolution or DPI and try again.`
                  };
                }
                
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
              try {
                img = await page.objs.get(objId);
              } catch (e) {
                if (typeof objId === 'string' && objId.startsWith('g_')) {
                  img = await page.commonObjs.get(objId);
                } else {
                  throw e;
                }
              }
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
    if (worker) {
      console.log("[IMAGE PERF] terminating Tesseract worker");
      try {
        await worker.terminate();
      } catch (e) {
        console.error("[KB ERROR] Failed to terminate worker:", e);
      }
    }
    // MUST destroy document to release unmanaged memory
    try {
      await pdfDoc.destroy();
    } catch (e) {
      console.error("[KB ERROR] Failed to destroy pdfDoc:", e);
    }
  }
}
