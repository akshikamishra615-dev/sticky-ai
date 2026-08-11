import { AiClient } from "@/components/ai/ai-client";
import { getConversations } from "@/lib/server/conversations";
import { type Conversation } from "@/lib/mock-data";

export default async function AIPage() {
  const serverConversations = await getConversations();
  
  return <AiClient initialConversations={serverConversations as unknown as Conversation[]} />;
}
