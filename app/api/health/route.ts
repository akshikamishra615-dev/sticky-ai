import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Basic DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // Return a generic error message to avoid leaking stack traces or credentials
    return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 503 });
  }
}
