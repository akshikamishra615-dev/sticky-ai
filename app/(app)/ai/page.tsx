import { AiClient } from "@/components/ai/ai-client";
import { getConversations } from "@/lib/server/conversations";
import { type Conversation } from "@/lib/mock-data";

import { auth } from "@/auth";

export default async function AIPage() {
  const serverConversations = await getConversations();
  const session = await auth();
  
  return <AiClient 
    initialConversations={serverConversations as unknown as Conversation[]} 
    userName={session?.user?.name || "User"}
    userImage={session?.user?.image || undefined}
  />;
}
