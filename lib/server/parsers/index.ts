import { ParsedChunk } from "./types";
import { parsePDF } from "./pdf";
import { parseDocx, parseLegacyDoc } from "./word";
import { parseExcel } from "./excel";
import { parsePptx, parseLegacyPpt } from "./powerpoint";
import { parseTxt } from "./text";
import { parseImage } from "./image";

export async function parseDocumentFile(buffer: Buffer, mimeType: string, filename: string, onOcrScanning?: () => Promise<void>): Promise<ParsedChunk[]> {
  const ext = filename.split('.').pop()?.toLowerCase() || "";
  
  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    return parsePDF(buffer, onOcrScanning);
  }
  
  // DOCX
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") {
    return parseDocx(buffer);
  }
  
  // DOC (Legacy)
  if (mimeType === "application/msword" || ext === "doc") {
    return parseLegacyDoc(buffer);
  }
  
  // XLSX / XLS / CSV
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
    mimeType === "application/vnd.ms-excel" || 
    mimeType === "text/csv" || 
    ["xlsx", "xls", "csv"].includes(ext)
  ) {
    return parseExcel(buffer, mimeType, ext);
  }
  
  // PPTX
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || ext === "pptx") {
    return parsePptx(buffer);
  }
  
  // PPT (Legacy)
  if (mimeType === "application/vnd.ms-powerpoint" || ext === "ppt") {
    return parseLegacyPpt(buffer);
  }
  
  // TXT
  if (mimeType === "text/plain" || ext === "txt") {
    return parseTxt(buffer);
  }
  
  // Images (OCR)
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return parseImage(buffer);
  }

  throw { code: "UNSUPPORTED_FORMAT", message: "Unsupported file type." };
}
