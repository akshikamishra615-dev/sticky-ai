import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createChatStream } from "@/lib/server/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { conversationId, messages, useRAG, language } = body as { conversationId: string, messages: { role: 'user' | 'assistant', content: string }[], useRAG?: boolean, language?: string };

    if (!conversationId || !messages || messages.length === 0) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    // Protect input length (e.g., max 2000 chars for the latest user message)
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'user' || latestMessage.content.length > 2000) {
      return new NextResponse("Invalid message or message too long", { status: 400 });
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Map to CoreMessage and enforce strict limit on context (last 10 messages)
    const contextMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Save the user's latest message to the database (only if it's the actual new one)
    // Wait, the client handles the saving in ai-client.tsx via saveMessage?
    // The instructions said:
    // Flow: Client -> Server -> Auth -> Verify -> Save User Message -> Load Context -> Send to OpenAI -> Stream -> Save AI Response
    // If we handle saving here, we don't need the client to call `saveMessage` for the user message.
    // Let's rely on the client's `saveMessage` for the user message to keep the optimistic UI exactly as it was,
    // or we can handle saving the AI message at the end of the stream.
    // The instruction says: "Save AI response to PostgreSQL within the onFinish callback."
    // Let's just do the stream and save the AI response.
    console.log("[AI Chat Route] Request received for conversation:", conversationId);
    console.log("[AI Chat Route] Authenticated user exists. ID length:", session.user.id?.length);
    console.log("[AI Chat Route] Conversation ownership verified.");
    console.log("[AI Chat Route] Context messages count:", contextMessages.length);
    
    // Fetch user profile for personalization
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    });
    
    let ragContext: string | undefined = undefined;
    if (useRAG && latestMessage.role === 'user') {
      try {
        const { searchKnowledgeBase } = await import("@/lib/server/rag");
        const chunks = await searchKnowledgeBase(latestMessage.content, session.user.id);
        
        if (chunks && chunks.length > 0) {
          ragContext = chunks.map(c => `[From Document: ${c.metadata?.documentName || 'Unknown'}]\n${c.content}`).join('\n\n');
        }
      } catch (e) {
        console.error("[AI Chat Route] RAG search failed:", e);
      }
    }

    console.log("[AI Chat Route] Initializing Groq stream...");

    const result = await createChatStream(contextMessages, {
      ragContext,
      language,
      userProfileMetadata: profile?.educationMetadata as Record<string, string> | undefined,
      onFinish: async ({ text }) => {
        console.log("[AI Chat Route] Stream onFinish triggered. Generated text length:", text.length);
        if (text.length > 0) {
        // Save AI response to DB
        await prisma.message.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: text
          }
        });
        console.log("[AI Chat Route] Saved generated message to DB.");
      } else {
        console.warn("[AI Chat Route] Stream finished but text is empty!");
      }
    } });
    
    console.log("[AI Chat Route] Stream initialized. Returning text stream response.");

    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
