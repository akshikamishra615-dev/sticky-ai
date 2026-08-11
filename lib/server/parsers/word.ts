import { ParsedChunk } from "./types";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import TurndownService from "turndown";

export async function parseDocx(buffer: Buffer): Promise<ParsedChunk[]> {
  const result = await mammoth.convertToHtml({ buffer });
  
  if (!result.value || result.value.trim().length === 0) {
    throw { code: "EMPTY_FILE", message: "No readable text could be extracted from this Word document." };
  }

  // Convert Mammoth's clean HTML into Markdown to preserve headings, lists, tables
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  });
  
  // Turndown doesn't support tables natively by default, but it falls back to raw text if not configured.
  // We can add a simple rule for tables or rely on the turndown-plugin-gfm if needed. 
  // Mammoth outputs <table><tr><td>...
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function (content) {
      return ' | ' + content + ' ';
    }
  });
  turndownService.addRule('tableRow', {
    filter: 'tr',
    replacement: function (content) {
      return '\n' + content + ' |\n';
    }
  });
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function (content) {
      return '\n\n' + content + '\n\n';
    }
  });

  const markdownText = turndownService.turndown(result.value);

  if (!markdownText || markdownText.trim().length === 0) {
    throw { code: "EMPTY_FILE", message: "No readable text could be extracted from this Word document." };
  }

  // Preserve meaningful metadata
  const metadata: Record<string, unknown> = {
    sourceType: "DOCX"
  };

  if (result.messages && result.messages.length > 0) {
    metadata.warnings = result.messages.length;
  }

  return [{ 
    text: markdownText,
    metadata 
  }];
}

export async function parseLegacyDoc(buffer: Buffer): Promise<ParsedChunk[]> {
  try {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(buffer);
    const text = extracted.getBody();
    
    if (!text || text.trim().length === 0) {
      throw { code: "EMPTY_FILE", message: "No readable text was found in this legacy Word document." };
    }

    return [{ text }];
  } catch (error) {
    console.error("[KB] Legacy DOC parser error:", error);
    throw { code: "UNSUPPORTED_FORMAT", message: "We couldn't extract readable content from this legacy file format." };
  }
}
