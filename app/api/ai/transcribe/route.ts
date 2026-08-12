import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: "No audio file provided." }, { status: 400 });
    }

    // Verify Groq API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Transcription service not configured." }, { status: 500 });
    }

    // Forward the file directly to Groq's Whisper API
    const groqFormData = new FormData();
    groqFormData.append("file", file);
    groqFormData.append("model", "whisper-large-v3-turbo");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: groqFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Transcription Error]", response.status, errorText);
      return NextResponse.json({ success: false, error: "Failed to transcribe audio." }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, text: data.text });
  } catch (error) {
    console.error("[Transcription Error]:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
