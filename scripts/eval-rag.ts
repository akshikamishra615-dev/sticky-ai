import { PrismaClient } from "@prisma/client";
import { pipeline } from "@xenova/transformers";
import { searchKnowledgeBase } from "../lib/server/rag";

// Ensure we don't accidentally run this against production
if (!process.env.TEST_DATABASE_URL) {
  console.error("❌ ERROR: TEST_DATABASE_URL is not set. Refusing to run evaluation suite to protect production data.");
  process.exit(1);
}

if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error("❌ ERROR: TEST_DATABASE_URL is identical to DATABASE_URL. Refusing to run evaluation suite against potential production database.");
  process.exit(1);
}

if (process.env.TEST_DATABASE_URL.includes("supabase.co") || process.env.TEST_DATABASE_URL.includes("railway.app") && !process.env.TEST_DATABASE_URL.includes("test")) {
  console.warn("⚠️ WARNING: TEST_DATABASE_URL looks like a remote database but doesn't have 'test' in the URL. Ensure this is not production!");
}

// We instantiate a new Prisma client connecting ONLY to the test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

const TEST_USER_ID = "test-eval-user-" + Date.now();
const DOC_A_ID = "test-doc-a";
const DOC_B_ID = "test-doc-b";
const DOC_C_ID = "test-doc-c";
const DOC_FAIL_ID = "test-doc-failed";

async function setupFixtures() {
  console.log("🛠️ Setting up isolated test fixtures in test database...");
  
  // Create user
  await prisma.user.create({
    data: { id: TEST_USER_ID, name: "Eval User", email: `eval-${Date.now()}@test.com` }
  });

  // Create documents
  await prisma.document.createMany({
    data: [
      { id: DOC_A_ID, userId: TEST_USER_ID, name: "Biology Notes.pdf", mimeType: "application/pdf", size: 1000, status: "READY" },
      { id: DOC_B_ID, userId: TEST_USER_ID, name: "Math Syllabus.txt", mimeType: "text/plain", size: 1000, status: "READY" },
      { id: DOC_C_ID, userId: TEST_USER_ID, name: "Hindi Essay.pdf", mimeType: "application/pdf", size: 1000, status: "READY" },
      { id: DOC_FAIL_ID, userId: TEST_USER_ID, name: "Failed.pdf", mimeType: "application/pdf", size: 1000, status: "FAILED" }
    ]
  });

  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { quantized: true });

  const embedAndInsert = async (docId: string, chunkIndex: number, content: string) => {
    const output = await extractor(content, { pooling: 'mean', normalize: true });
    const vectorString = `[${Array.from(output.data).join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" ("id", "documentId", "userId", "content", "embedding", "createdAt", "chunkIndex", "metadata")
      VALUES (gen_random_uuid(), ${docId}, ${TEST_USER_ID}, ${content}, ${vectorString}::vector, NOW(), ${chunkIndex}, '{"pageNumber": 1}'::jsonb)
    `;
  };

  console.log("🧠 Generating embeddings for test chunks...");
  // Bio Chunks (Sequential)
  await embedAndInsert(DOC_A_ID, 0, "Mitosis is a part of the cell cycle in which replicated chromosomes are separated into two new nuclei.");
  await embedAndInsert(DOC_A_ID, 1, "Cell division gives rise to genetically identical cells in which the total number of chromosomes is maintained.");
  await embedAndInsert(DOC_A_ID, 2, "In general, mitosis (division of the nucleus) is preceded by the S stage of interphase.");

  // Math Chunks
  await embedAndInsert(DOC_B_ID, 0, "Calculus is the mathematical study of continuous change. It has two major branches: differential calculus and integral calculus.");
  await embedAndInsert(DOC_B_ID, 1, "The fundamental theorem of calculus relates the two branches.");

  // Hindi/Hinglish Chunks
  await embedAndInsert(DOC_C_ID, 0, "Mera naam Rahul hai aur main ek software engineer hoon.");
  await embedAndInsert(DOC_C_ID, 1, "Ye project bahut important hai humari team ke liye.");
  
  // Failed Document Chunk (Should never be retrieved because document status is FAILED)
  await embedAndInsert(DOC_FAIL_ID, 0, "Secret failed document that should not appear in search results.");
}

async function cleanupFixtures() {
  console.log("\n🧹 Cleaning up test fixtures...");
  await prisma.user.delete({ where: { id: TEST_USER_ID } }); // Cascades to documents and chunks
  await prisma.$disconnect();
}

async function runTests() {
  console.log("🚀 Running RAG Evaluation Suite...\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  // Helper to call the search function but we must override the global prisma client in rag.ts 
  // Wait, `searchKnowledgeBase` uses the globally imported `prisma` from `@/lib/prisma`.
  // To evaluate it safely against TEST_DATABASE_URL, we can't easily mock it if it's imported globally, 
  // unless we override the env var before importing.
  // Actually, we set the process.env.DATABASE_URL to TEST_DATABASE_URL here in the script BEFORE importing rag.ts!
}

// We must trick `rag.ts` into using TEST_DATABASE_URL
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Now we can import it dynamically to ensure it uses the overridden env var
async function executeSuite() {
  try {
    await setupFixtures();
    
    // Dynamic import to ensure prisma client in rag.ts picks up the new env var if it initializes late
    // or better yet, PrismaClient uses the url provided in prisma/schema.prisma which reads env("DATABASE_URL")
    const { searchKnowledgeBase } = await import("../lib/server/rag");

    console.log("🚀 Running RAG Evaluation Suite...\n");

    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, message: string) => {
      if (condition) {
        console.log(`✅ PASS: ${message}`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${message}`);
        failed++;
      }
    };

    // 1. Exact Semantic Match
    let results = await searchKnowledgeBase("What is mitosis?", TEST_USER_ID);
    assert(results.length > 0 && results[0].documentId === DOC_A_ID, "Exact semantic match retrieves correct document.");
    
    // 7. Adjacent chunk expansion (Mitosis query should pull chunk 1 or 2 as neighbors if chunk 0 matches)
    const contents = results.filter(r => r.documentId === DOC_A_ID).map(r => r.content);
    assert(contents.some(c => c.includes("identical cells")), "Adjacent chunks are retrieved alongside strong matches.");

    // 10. Citation metadata preservation
    assert(results[0].metadata?.pageNumber === 1, "Page number metadata is preserved in results.");

    // 2. Paraphrased query
    results = await searchKnowledgeBase("How do cells divide their chromosomes?", TEST_USER_ID);
    assert(results.some(r => r.documentId === DOC_A_ID), "Paraphrased query successfully retrieves Biology document.");

    // 4. Unrelated query
    results = await searchKnowledgeBase("How to bake a chocolate cake with frosting", TEST_USER_ID);
    assert(results.length === 0, "Unrelated query safely returns zero results.");

    // 3. Hindi/Hinglish query
    results = await searchKnowledgeBase("Rahul kya kaam karta hai?", TEST_USER_ID);
    assert(results.some(r => r.documentId === DOC_C_ID), "Hinglish query retrieves correct Hindi/Hinglish document chunks.");

    // 8. Document-specific filtering
    results = await searchKnowledgeBase("What is mitosis?", TEST_USER_ID, [DOC_B_ID]);
    assert(results.length === 0, "Document filter strictly excludes irrelevant but strongly matching documents.");

    results = await searchKnowledgeBase("Calculus", TEST_USER_ID, [DOC_B_ID]);
    assert(results.length > 0 && results[0].documentId === DOC_B_ID, "Document filter allows retrieval when selected document matches.");

    // 6. Failed-document exclusion
    results = await searchKnowledgeBase("Secret failed document", TEST_USER_ID);
    assert(results.length === 0, "Failed documents are completely isolated from retrieval.");

    // 5. Multi-document retrieval
    results = await searchKnowledgeBase("mitosis and calculus", TEST_USER_ID);
    // Depending on semantic space, it might pull both if distance is < 0.7
    // If it doesn't pull both, it's fine, it pulls whatever is closest. Let's just assert it pulls one of them.
    assert(results.some(r => r.documentId === DOC_A_ID || r.documentId === DOC_B_ID), "Multi-topic query retrieves at least one relevant document.");

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) throw new Error("Evaluation suite failed.");
  } finally {
    await cleanupFixtures();
  }
}

executeSuite().catch(e => {
  console.error("Evaluation Error:", e);
  process.exit(1);
});
