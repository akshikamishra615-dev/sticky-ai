import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";

export async function GET() {
  try {
    // Basic DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    let redisStatus = "not_configured";
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        
        // Short timeout to avoid hanging health check
        const pingPromise = redis.ping();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Redis ping timeout")), 1500)
        );
        
        await Promise.race([pingPromise, timeoutPromise]);
        redisStatus = "ok";
      } catch (redisError: any) {
        console.error("[HEALTH ERROR] Redis connection failed:", redisError?.message || String(redisError));
        redisStatus = "error";
      }
    }

    if (redisStatus === "error") {
      return NextResponse.json({ status: "error", redis: "error", message: "Cache connection failed" }, { status: 503 });
    }

    return NextResponse.json({ status: "ok", redis: redisStatus });
  } catch (error) {
    // Return a generic error message to avoid leaking stack traces or credentials
    return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 503 });
  }
}
