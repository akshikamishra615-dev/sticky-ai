import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/server/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: "Empty file" }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || "";
    const isImage = file.type.startsWith('image/');
    const SUPPORTED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
    
    if (!isImage || !SUPPORTED_EXTS.includes(ext)) {
      return NextResponse.json({ success: false, error: "Unsupported image type." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ success: false, error: "File is too large." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Fetch current user to get old image URL
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true }
    });

    const result = await uploadToCloudinary(buffer, userId, "sticky-ai/profiles");
    
    // Update user profile in database
    await prisma.user.update({
      where: { id: userId },
      data: { image: result.url }
    });

    // Cleanup old Cloudinary image if it exists
    if (currentUser?.image?.includes("res.cloudinary.com") && currentUser.image.includes("sticky-ai/profiles")) {
      try {
        // Extract public_id from URL. URL format: .../upload/v1234/folder/filename.ext
        const parts = currentUser.image.split("sticky-ai/profiles/");
        if (parts.length === 2) {
          const filenameWithExt = parts[1];
          const publicId = "sticky-ai/profiles/" + filenameWithExt.split(".")[0];
          await deleteFromCloudinary(publicId);
        }
      } catch (e) {
        console.error("Failed to delete old Cloudinary image:", e);
      }
    }

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    console.error("[Profile Upload] Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

