import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeFile } from "@/lib/server/storage";
import { prisma } from "@/lib/prisma";

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

    try {
      const stored = await storeFile(file, userId, { subDirectory: "profiles" });
      
      // Update user profile in database
      await prisma.user.update({
        where: { id: userId },
        data: { image: stored.url }
      });

      return NextResponse.json({ success: true, url: stored.url });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "UNSUPPORTED_FILE_TYPE") {
          return NextResponse.json({ success: false, error: "Unsupported image type." }, { status: 400 });
        }
        if (err.message === "FILE_TOO_LARGE") {
          return NextResponse.json({ success: false, error: "File is too large." }, { status: 400 });
        }
      }
      throw err;
    }
  } catch (error) {
    console.error("[Profile Upload] Error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
