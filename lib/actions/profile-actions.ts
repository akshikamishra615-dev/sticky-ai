"use server"

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfileMetadata(educationMetadata: Record<string, string>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  // Basic validation to prevent extremely large payloads
  if (JSON.stringify(educationMetadata).length > 5000) {
    throw new Error("Payload too large");
  }

  try {
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: { educationMetadata },
      create: {
        userId: session.user.id,
        educationMetadata
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile metadata:", error);
    return { success: false, error: "Failed to update profile." };
  }
}

export async function updateUserName(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  if (!name.trim() || name.length > 50) {
    return { success: false, error: "Invalid name" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() }
    });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update name:", error);
    return { success: false, error: "Failed to update name." };
  }
}

export async function removeProfileImage() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null }
    });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to remove profile image:", error);
    return { success: false, error: "Failed to remove image." };
  }
}
