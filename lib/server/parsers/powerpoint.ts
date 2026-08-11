import { ParsedChunk } from "./types";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";

export async function parsePptx(buffer: Buffer): Promise<ParsedChunk[]> {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    const chunks: ParsedChunk[] = [];
    
    // Find all slide XML files
    const slideEntries = zipEntries.filter(entry => entry.entryName.match(/ppt\/slides\/slide\d+\.xml/i));
    
    for (const entry of slideEntries) {
      // Extract slide number from filename
      const match = entry.entryName.match(/slide(\d+)\.xml/i);
      const slideNumber = match ? parseInt(match[1]) : 0;
      
      const xmlStr = entry.getData().toString("utf8");
      const result = await parseStringPromise(xmlStr);
      
      let slideText = "";
      
      // Basic recursive extraction to find all a:t elements (text nodes in PPTX)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractText = (obj: any) => {
        if (typeof obj === "string") return;
        if (Array.isArray(obj)) {
          obj.forEach(extractText);
          return;
        }
        for (const key in obj) {
          if (key === "a:t") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textContent = Array.isArray(obj[key]) ? obj[key].map((t: any) => typeof t === "string" ? t : t._).join(" ") : (typeof obj[key] === "string" ? obj[key] : obj[key]._);
            if (textContent) slideText += textContent + "\n";
          } else if (typeof obj[key] === "object") {
            extractText(obj[key]);
          }
        }
      };
      
      extractText(result);
      
      if (slideText.trim().length > 0) {
        chunks.push({
          text: slideText.trim(),
          metadata: { slideNumber }
        });
      }
    }
    
    if (chunks.length === 0) {
      throw { code: "EMPTY_FILE", message: "No readable text was found in this presentation." };
    }
    
    return chunks;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === "EMPTY_FILE") throw error;
    console.error("[KB] PPTX parser error:", error);
    throw { code: "UNSUPPORTED_FORMAT", message: "We couldn't extract readable content from this PowerPoint document." };
  }
}

export async function parseLegacyPpt(_buffer: Buffer): Promise<ParsedChunk[]> {
  // Legacy .ppt is extremely difficult in Node without system dependencies.
  throw { code: "UNSUPPORTED_FORMAT", message: "We couldn't extract readable content from this legacy file format." };
}
