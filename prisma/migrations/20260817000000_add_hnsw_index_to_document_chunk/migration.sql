-- Add HNSW index for cosine distance on DocumentChunk.embedding
-- This significantly speeds up RAG queries using the `<=>` operator (cosine distance).
-- Requires pgvector 0.5.0+.

CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_hnsw_idx" 
ON "DocumentChunk" 
USING hnsw (embedding vector_cosine_ops);
