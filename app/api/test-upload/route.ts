import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const SUPPORTED_FORMATS = [
  { ext: "pdf", mime: "application/pdf", limit: 10 * 1024 * 1024, type: "PDF" },
  { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", limit: 10 * 1024 * 1024, type: "Word" },
];

export async function POST(req: NextRequest) {
  try {
    const userId = "test-user-id";
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: { code: "EMPTY_FILE", message: "No file was uploaded." } }, { status: 400 });
    }
    
    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase() || "";
    
    const format = SUPPORTED_FORMATS.find(f => f.ext === ext);
    if (!format) {
      return NextResponse.json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported file type." } }, { status: 400 });
    }

    const safeFilename = `${userId}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      id: "test-id",
      name: originalName,
      status: "PROCESSING_DOCUMENT",
    });
  } catch (error) {
    console.error("[KB] Upload error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Error" } }, { status: 500 });
  }
}
