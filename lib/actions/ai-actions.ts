"use server"

import { auth } from "@/auth";
import { generateEducationalNote } from "@/lib/server/ai";

export async function generateNoteAction(subject: string, topic: string, config: { style?: string, instructions?: string, educationMetadata?: Record<string, string> }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
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
