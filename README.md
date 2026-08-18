# Sticky AI

Sticky AI is an advanced, production-ready full-stack application featuring a powerful AI chat interface, a Retrieval-Augmented Generation (RAG) knowledge base, and automated document processing capabilities. It securely ingests, vectors, and queries user documents using cutting-edge edge and cloud technologies.

## 🚀 Core Features

- **AI Chat & Mentorship:** Direct streaming chat interface powered by Groq.
- **Knowledge Base (RAG):** Upload and chat with your PDF documents.
- **Document Processing Pipeline:** Asynchronous document ingestion, chunking, and embedding generation.
- **Vector Search:** HNSW (Hierarchical Navigable Small World) based semantic search utilizing PostgreSQL's `pgvector` extension.
- **Responsive UI:** Built with Tailwind CSS, ensuring accessibility and mobile readiness.
- **Security & Isolation:** Role-based access control, secure user-isolated file storage, and encrypted cloud synchronization.

## 🛠 Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Database & ORM:** PostgreSQL + [Prisma](https://www.prisma.io/) + `pgvector`
- **Background Processing & Rate Limiting:** [Upstash Redis](https://upstash.com/)
- **Storage:** S3-compatible Blob Storage (e.g., Cloudflare R2)
- **AI & Embeddings:** [Groq](https://groq.com/) for high-speed LLM inference, `Transformers.js` / Xenova for local or edge embedding generation
- **Authentication:** [Auth.js](https://authjs.dev/) (NextAuth v5)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

## 📄 Document Processing Lifecycle

1. **Upload:** User securely uploads a PDF through the UI. It goes directly to S3/R2 Blob storage.
2. **Queueing:** A job is added to the Upstash Redis queue. The document status is updated to `QUEUED`.
3. **Processing:** A background worker retrieves the PDF from S3, extracts the raw text using `pdf-parse`, and splits it into logical chunks. Status updates to `PROCESSING`.
4. **Indexing:** Semantic embeddings are generated for each chunk. The chunks are saved and indexed via `pgvector` in PostgreSQL.
5. **Ready:** Status updates to `READY`. The document is now available for RAG in the chat UI.

## ⚙️ Environment Variable Setup

Copy the `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Essential Variables:
- `DATABASE_URL`: PostgreSQL connection string (must have `pgvector` enabled).
- `AUTH_SECRET`: Generate one using `npx auth secret`.
- `GROQ_API_KEY`: Your Groq API key.
- `GROQ_MODEL`: Your preferred model (e.g., `openai/gpt-oss-20b`).
- `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: Required for file uploads to S3/R2.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Required for background workers and rate limiting.
- `CLOUDINARY_*`: (Optional) Required if handling user avatar image uploads.

## 💻 Local Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   Ensure your PostgreSQL instance is running and has the `vector` extension enabled.
   ```bash
   # Push the schema to the database
   npx prisma db push
   
   # Generate Prisma client
   npx prisma generate
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🚢 Deployment (Railway)

Sticky AI is configured to deploy seamlessly on [Railway](https://railway.app/).

1. Connect your GitHub repository to Railway.
2. Add your environment variables in the Railway Dashboard.
3. The Railway Nixpacks builder will automatically run `npm install` and `npm run build`.

**Important Build Note:** Next.js is explicitly configured to use `experimental: { cpus: 1 }` in `next.config.ts`. This is a critical memory safety constraint to prevent Out-Of-Memory (OOM) `Killed` errors in containerized build environments where Next.js attempts to read the host node's CPU count. Do not remove this unless you are deploying to a dedicated host with significant memory.

## 🔒 Security & User-Isolation Notes

- All uploaded files are physically isolated and conceptually mapped to individual user IDs via the database.
- Chat history and document contexts are strictly guarded by server-side Auth.js session validation.
- Rate limiting is aggressively applied via Upstash to protect the LLM and DB infrastructure.
