import { ParsedChunk } from "./types";
import * as xlsx from "xlsx";

const MAX_CELLS = 100000;
const ROWS_PER_CHUNK = 50;

export async function parseExcel(buffer: Buffer, mimeType: string, ext: string): Promise<ParsedChunk[]> {
  let sourceType = "XLSX";
  if (ext === "xls" || mimeType === "application/vnd.ms-excel") {
    sourceType = "XLS";
  } else if (ext === "csv" || mimeType === "text/csv") {
    sourceType = "CSV";
  }

  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: "buffer" });
  } catch (error) {
    throw { code: "UNSUPPORTED_FORMAT", message: "We couldn't read this spreadsheet." };
  }
  
  const chunks: ParsedChunk[] = [];
  let totalCellsProcessed = 0;
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // sheet_to_json with header: 1 returns an array of arrays (rows of columns)
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    
    if (!rawRows || rawRows.length === 0) continue;

    // Find the first non-empty row to use as headers
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.some(cell => String(cell).trim() !== "")) {
        headerRowIndex = i;
        headers = row.map(h => String(h).trim());
        break;
      }
    }

    if (headerRowIndex === -1) continue; // Completely empty sheet

    let currentChunkText = "";
    let chunkStartRow = headerRowIndex + 1; // logical start row (1-indexed for users would be + 2)
    let rowsInCurrentChunk = 0;

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      // Skip completely empty rows
      if (!row.some(cell => String(cell).trim() !== "")) continue;

      let rowText = "";
      if (sourceType !== "CSV") {
        rowText += `Sheet: ${sheetName}\n`;
      }
      
      for (let j = 0; j < Math.max(headers.length, row.length); j++) {
        const header = headers[j] || `Column ${j + 1}`;
        const val = row[j] !== undefined ? String(row[j]).trim() : "";
        if (val !== "") {
          rowText += `${header}: ${val}\n`;
        }
        totalCellsProcessed++;
      }
      
      if (totalCellsProcessed > MAX_CELLS) {
        throw { code: "SPREADSHEET_TOO_LARGE", message: "This spreadsheet contains too much data to process safely." };
      }

      currentChunkText += rowText + "\n";
      rowsInCurrentChunk++;

      // When chunk is full, push it
      if (rowsInCurrentChunk >= ROWS_PER_CHUNK) {
        const chunkEndRow = i;
        const metadata: Record<string, unknown> = {
          sourceType,
          rowRange: `${chunkStartRow + 1}-${chunkEndRow + 1}`
        };
        if (sourceType !== "CSV") metadata.sheetName = sheetName;
        
        chunks.push({ text: currentChunkText.trim(), metadata });
        
        currentChunkText = "";
        chunkStartRow = i + 1;
        rowsInCurrentChunk = 0;
      }
    }

    // Push remaining rows in the sheet
    if (rowsInCurrentChunk > 0) {
      const metadata: Record<string, unknown> = {
        sourceType,
        rowRange: `${chunkStartRow + 1}-${rawRows.length}`
      };
      if (sourceType !== "CSV") metadata.sheetName = sheetName;
      
      chunks.push({ text: currentChunkText.trim(), metadata });
    }
  }

  if (chunks.length === 0) {
    throw { code: "EMPTY_FILE", message: "No readable data could be extracted from this spreadsheet." };
  }

  return chunks;
}
