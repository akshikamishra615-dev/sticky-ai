"use server"

import { auth } from "@/auth";
import { generateEducationalNote } from "@/lib/server/ai";
import { rateLimiters, getRateLimitKey } from "@/lib/server/ratelimit";
import { headers } from "next/headers";

export async function generateNoteAction(subject: string, topic: string, config: { style?: string, instructions?: string, educationMetadata?: Record<string, string> }) {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) throw new Error("Unauthorized");

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0].trim() || headerList.get("x-real-ip")?.trim() || "127.0.0.1";
  
  const rateLimitKey = getRateLimitKey(ip, userId);
  const { success } = await rateLimiters.ai.limit(rateLimitKey);
  if (!success) {
    return { success: false, error: "Too Many Requests" };
  }

  if (!subject.trim() || !topic.trim()) {
    throw new Error("Subject and Topic are required.");
  }
  
  // Protect against huge inputs
  if (subject.length > 100 || topic.length > 200 || (config.instructions && config.instructions.length > 1000)) {
    throw new Error("Input exceeds maximum length.");
  }

  try {
    const generatedNote = await generateEducationalNote(subject, topic, config);
    return { success: true, note: generatedNote };
  } catch (error) {
    console.error("Failed to generate note:", error);
    return { success: false, error: "Failed to generate note. Please try again." };
  }
}
