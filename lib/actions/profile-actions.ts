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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true }
    });

    if (user?.image?.includes("res.cloudinary.com") && user.image.includes("sticky-ai/profiles")) {
      try {
        const parts = user.image.split("sticky-ai/profiles/");
        if (parts.length === 2) {
          const filenameWithExt = parts[1];
          const publicId = "sticky-ai/profiles/" + filenameWithExt.split(".")[0];
          // Dynamically import to avoid running Cloudinary config logic unnecessarily in other server actions
          const { deleteFromCloudinary } = await import("@/lib/server/cloudinary");
          await deleteFromCloudinary(publicId);
        }
      } catch (e) {
        console.error("Failed to delete Cloudinary image during removal:", e);
      }
    }

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
