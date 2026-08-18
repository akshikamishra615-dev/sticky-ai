import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/server/email";
import crypto from "crypto";
import { rateLimiters, getIp } from "@/lib/server/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req);
    const { success } = await rateLimiters.auth.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return this generic response to prevent email enumeration
    const genericResponse = NextResponse.json({ 
      success: true, 
      message: "If an account exists for this email, a password reset link has been sent." 
    });

    if (!user) {
      return genericResponse;
    }

    // Rate limiting: check if a token was created in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentToken) {
      // Silently ignore to prevent spam, but return success to user
      return genericResponse;
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Invalidate previous unused tokens
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Marking as used effectively invalidates them
      },
    });

    // Store the hash
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Construct reset URL using the request origin
    // Fallback to localhost in development, but request.nextUrl.origin contains the actual domain
    const origin = process.env.NEXTAUTH_URL || process.env.AUTH_URL || req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email!, resetUrl);
    
    if (!emailResult.success) {
      // Safe diagnostic log without secrets
      console.error(`Password reset email failed for user ${user.id}:`, (emailResult.error as Error)?.message || "Unknown error");
    } else {
      console.log(`Password reset email queued successfully for user ${user.id}`);
    }

    return genericResponse;

  } catch (error) {
    console.error("Forgot password error:", error);
    // Generic error response without leaking details
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
