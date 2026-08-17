import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import os from "os";
import { pipeline } from "stream/promises";

// Safe mock logic if ENV vars are missing during build/test
const isConfigured = !!process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // e.g., https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "mock-key",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "mock-secret",
  },
  // R2 often requires pathStyleEndpoint or specific settings, we'll leave defaults mostly
});

const BUCKET = process.env.S3_BUCKET_NAME || "mock-bucket";

export async function uploadToS3(key: string, body: Buffer | Uint8Array, mimeType: string): Promise<void> {
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("S3_BUCKET_NAME is not configured in production");
    }
    const mockPath = path.join(os.tmpdir(), "mock-s3", key);
    fs.mkdirSync(path.dirname(mockPath), { recursive: true });
    fs.writeFileSync(mockPath, body);
    return;
  }
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: mimeType,
  });
  await s3Client.send(command);
}

export async function downloadFromS3ToTempFile(key: string, tmpPath: string): Promise<void> {
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("S3_BUCKET_NAME is not configured in production");
    }
    const mockPath = path.join(os.tmpdir(), "mock-s3", key);
    if (!fs.existsSync(mockPath)) throw new Error("NoSuchKey");
    fs.copyFileSync(mockPath, tmpPath);
    return;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("Empty body from S3");
  }

  // Stream directly to disk to avoid loading massive PDFs in memory
  const writeStream = fs.createWriteStream(tmpPath);
  
  // Type assertion since S3 Body can be multiple stream types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyStream = response.Body as any;
  await pipeline(bodyStream, writeStream);
}

export async function deleteFromS3(key: string): Promise<void> {
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("S3_BUCKET_NAME is not configured in production");
    }
    const mockPath = path.join(os.tmpdir(), "mock-s3", key);
    if (fs.existsSync(mockPath)) fs.unlinkSync(mockPath);
    return;
  }
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

export async function checkS3ObjectExists(key: string): Promise<boolean> {
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("S3_BUCKET_NAME is not configured in production");
    }
    const mockPath = path.join(os.tmpdir(), "mock-s3", key);
    return fs.existsSync(mockPath);
  }
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}
