import { KnowledgeBaseClient } from "@/components/knowledge-base/knowledge-base-client";
import { getDocuments } from "@/lib/server/rag";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  const documents = await getDocuments();
  
  return <KnowledgeBaseClient initialDocuments={documents} />;
}
