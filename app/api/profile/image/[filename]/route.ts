import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFile } from "@/lib/server/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // We can allow public access to profile images since they are displayed in header,
    // OR we restrict to authenticated users. The requirements say:
    // "Profile image retrieval must verify the authenticated user before serving the image."
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // A user must never be able to view another user's profile - but what about their avatar?
    // Often avatars are public, but if required, we can check if the filename starts with their ID.
    // However, they might want to see someone else's avatar if there's collaboration later.
    // For now, restrict based on filename containing the user's ID as generated in `storeFile`.
    if (!filename.startsWith(session.user.id + "-")) {
       return new NextResponse("Forbidden", { status: 403 });
    }

    const file = await getFile(filename, { subDirectory: "profiles" });
    
    if (!file) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    console.error("[Profile Image] Error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
