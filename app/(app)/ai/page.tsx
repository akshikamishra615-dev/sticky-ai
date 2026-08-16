import { AiClient } from "@/components/ai/ai-client";
import { getConversations } from "@/lib/server/conversations";
import { type Conversation } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function AIPage() {
  const serverConversations = await getConversations();
  const session = await auth();
  
  const documents = session?.user?.id 
    ? await prisma.document.findMany({ 
        where: { userId: session.user.id, status: 'READY' },
        select: { id: true, name: true }
      })
    : [];

  return <AiClient 
    initialConversations={serverConversations as unknown as Conversation[]} 
    initialDocuments={documents}
    userName={session?.user?.name || "User"}
    userImage={session?.user?.image || undefined}
  />;
}
