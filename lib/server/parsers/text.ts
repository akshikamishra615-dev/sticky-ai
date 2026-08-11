import { ParsedChunk } from "./types";

export async function parseTxt(buffer: Buffer): Promise<ParsedChunk[]> {
  const text = buffer.toString("utf-8");
  
  if (!text || text.trim().length === 0) {
    throw { code: "EMPTY_FILE", message: "No readable text was found in this text file." };
  }

  return [{ text }];
}
