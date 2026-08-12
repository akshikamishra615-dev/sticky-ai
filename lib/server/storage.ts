import fs from "fs";
import path from "path";
import crypto from "crypto";
import { SUPPORTED_FORMATS } from "@/lib/shared/file-validation";

const BASE_UPLOAD_DIR = path.join(process.cwd(), ".data/uploads");

export interface StorageOptions {
  subDirectory?: string;
}

export async function storeFile(file: File, userId: string, options: StorageOptions = {}): Promise<{ filename: string; url: string; size: number; mimeType: string }> {
  const dir = options.subDirectory ? path.join(BASE_UPLOAD_DIR, options.subDirectory) : BASE_UPLOAD_DIR;
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const originalName = file.name;
  const ext = originalName.split('.').pop()?.toLowerCase() || "";
  
  // Only allow image extensions for now, as this is used for profile images.
  // We can expand this utility for documents if needed.
  const isImage = file.type.startsWith('image/');
  
  const format = SUPPORTED_FORMATS.find(f => f.ext === ext);
  
  if (!format || !isImage) {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }

  if (file.size > format.limit) {
    throw new Error("FILE_TOO_LARGE");
  }

  const safeFilename = `${userId}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(dir, safeFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Return a safe identifier. The consumer route determines the URL.
  return {
    filename: safeFilename,
    url: `/api/profile/image/${safeFilename}`, // For now, hardcode to profile image route since it's the main consumer
    size: file.size,
    mimeType: file.type
  };
}

export async function getFile(filename: string, options: StorageOptions = {}): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return null;
  }

  const dir = options.subDirectory ? path.join(BASE_UPLOAD_DIR, options.subDirectory) : BASE_UPLOAD_DIR;
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = filename.split('.').pop()?.toLowerCase() || "";
  let mimeType = "application/octet-stream";
  if (ext === "png") mimeType = "image/png";
  if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
  if (ext === "webp") mimeType = "image/webp";
  if (ext === "gif") mimeType = "image/gif";

  const buffer = fs.readFileSync(filePath);
  return { buffer, mimeType };
}
