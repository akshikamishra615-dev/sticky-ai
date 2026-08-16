import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SUPPORTED_FORMATS } from "@/lib/shared/file-validation";
import { parseDocumentFile } from "@/lib/server/parsers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: { code: "EMPTY_FILE", message: "No file was uploaded." } }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || "";
    const format = SUPPORTED_FORMATS.find(f => f.ext === ext);
    
    if (!format) {
      return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported file type." } }, { status: 400 });
    }

    if (file.type && file.type !== format.mime) {
      return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "MIME type mismatch." } }, { status: 400 });
    }

    if (file.size > format.limit) {
      return NextResponse.json({ success: false, error: { code: "FILE_TOO_LARGE", message: `File too large.` } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (ext === 'pdf') {
      if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
        return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Invalid PDF signature." } }, { status: 400 });
      }
    }
    
    // Parse the document
    const parsedChunks = await parseDocumentFile(buffer, file.type, file.name);
    
    // Combine chunks into a single text string
    const extractedText = parsedChunks.map(chunk => chunk.text).join("\n\n");
    
    // Truncate to a reasonable length for immediate LLM context (e.g. 15,000 characters to stay within context window safely)
    const MAX_CHARS = 15000;
    let finalString = extractedText;
    if (extractedText.length > MAX_CHARS) {
      finalString = extractedText.substring(0, MAX_CHARS) + "\n...[Content truncated due to length limits]";
    }

    return NextResponse.json({ success: true, text: finalString, filename: file.name });
  } catch (error) {
    console.error("[Parse Attachment Error]:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to parse file." } }, { status: 500 });
  }
}
