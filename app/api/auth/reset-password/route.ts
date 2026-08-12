import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Hash the raw token to find it in the DB
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    if (resetRecord.usedAt) {
      return NextResponse.json({ error: "Token has already been used" }, { status: 400 });
    }

    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Also invalidate any other pending tokens for this user
      prisma.passwordResetToken.updateMany({
        where: { 
          userId: resetRecord.userId,
          id: { not: resetRecord.id },
          usedAt: null
        },
        data: { usedAt: new Date() }
      })
    ]);

    // Note: Since Auth.js is configured with JWT session strategy (stateless), 
    // we cannot easily invalidate existing sessions in other browsers without 
    // adding a session version check to the DB in the jwt callback. 
    // We update the password so new logins require the new password.

    return NextResponse.json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Reset password error:", error);
    // Generic error response
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
