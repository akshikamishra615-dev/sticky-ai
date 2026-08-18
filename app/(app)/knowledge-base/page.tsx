import { KnowledgeBaseClient } from "@/components/knowledge-base/knowledge-base-client";
import { getDocuments } from "@/lib/server/rag";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const q = typeof searchParams?.q === 'string' ? searchParams.q : "";
  const status = typeof searchParams?.status === 'string' ? searchParams.status : "ALL";

  const { documents, total, totalPages } = await getDocuments({ page, q, status });
  
  return <KnowledgeBaseClient initialDocuments={documents} total={total} totalPages={totalPages} currentPage={page} currentSearch={q} currentStatus={status} />;
}
