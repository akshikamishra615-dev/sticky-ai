// scripts/eval-rag.ts

// 1. VALIDATE TEST_DATABASE_URL BEFORE ANY IMPORTS
const testDbUrl = process.env.TEST_DATABASE_URL;
const prodDbUrl = process.env.DATABASE_URL;

if (!testDbUrl) {
  console.error("❌ ERROR: TEST_DATABASE_URL is not set. Refusing to run evaluation suite to protect production data.");
  process.exit(1);
}

if (testDbUrl === prodDbUrl) {
  console.error("❌ ERROR: TEST_DATABASE_URL is identical to DATABASE_URL. Refusing to run evaluation suite against potential production database.");
  process.exit(1);
}

const isLocalhost = testDbUrl.includes("localhost") || testDbUrl.includes("127.0.0.1");
if (!isLocalhost && !testDbUrl.includes("test")) {
  console.error("❌ ERROR: TEST_DATABASE_URL does not look like a safe test database (not localhost and missing 'test'). Refusing to run.");
  process.exit(1);
}

// 2. OVERRIDE DATABASE_URL FOR PRISMA
process.env.DATABASE_URL = testDbUrl;
console.log("🔒 Environment secured. DATABASE_URL successfully overridden to TEST_DATABASE_URL.");

// 3. DYNAMIC IMPORTS ONLY AFTER OVERRIDE
async function executeSuite() {
  const { PrismaClient } = await import("@prisma/client");
  const { pipeline } = await import("@xenova/transformers");
  const { searchKnowledgeBase } = await import("../lib/server/rag");

  const prisma = new PrismaClient();

  const TEST_USER_ID = "test-eval-user-" + Date.now();
  const UNAUTH_USER_ID = "unauth-eval-user-" + Date.now();
  
  const DOC_A_ID = "test-doc-a-" + Date.now();
  const DOC_B_ID = "test-doc-b-" + Date.now();
  const DOC_C_ID = "test-doc-c-" + Date.now();
  const DOC_FAIL_ID = "test-doc-failed-" + Date.now();
  const DOC_UNAUTH_ID = "test-doc-unauth-" + Date.now();

  async function setupFixtures() {
    console.log("🛠️ Setting up isolated test fixtures in test database...");
    
    // Create users
    await prisma.user.createMany({
      data: [
        { id: TEST_USER_ID, name: "Eval User", email: `eval-${Date.now()}@test.com` },
        { id: UNAUTH_USER_ID, name: "Unauth Eval User", email: `unauth-${Date.now()}@test.com` }
      ]
    });

    // Create documents
    await prisma.document.createMany({
      data: [
        { id: DOC_A_ID, userId: TEST_USER_ID, name: "Biology Notes.pdf", mimeType: "application/pdf", size: 1000, status: "READY" },
        { id: DOC_B_ID, userId: TEST_USER_ID, name: "Math Syllabus.txt", mimeType: "text/plain", size: 1000, status: "READY" },
        { id: DOC_C_ID, userId: TEST_USER_ID, name: "Hindi Essay.pdf", mimeType: "application/pdf", size: 1000, status: "READY" },
        { id: DOC_FAIL_ID, userId: TEST_USER_ID, name: "Failed.pdf", mimeType: "application/pdf", size: 1000, status: "FAILED" },
        { id: DOC_UNAUTH_ID, userId: UNAUTH_USER_ID, name: "Secret Unauthorized.pdf", mimeType: "application/pdf", size: 1000, status: "READY" }
      ]
    });

    const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { quantized: true });

    const embedAndInsert = async (docId: string, userId: string, chunkIndex: number, content: string) => {
      const output = await extractor(content, { pooling: 'mean', normalize: true });
      const vectorString = `[${Array.from(output.data).join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "userId", "content", "embedding", "createdAt", "chunkIndex", "metadata")
        VALUES (gen_random_uuid(), ${docId}, ${userId}, ${content}, ${vectorString}::vector, NOW(), ${chunkIndex}, '{"pageNumber": 1}'::jsonb)
      `;
    };

    console.log("🧠 Generating embeddings for test chunks...");
    
    // Bio Chunks (Sequential)
    await embedAndInsert(DOC_A_ID, TEST_USER_ID, 0, "Mitosis is a part of the cell cycle in which replicated chromosomes are separated into two new nuclei.");
    await embedAndInsert(DOC_A_ID, TEST_USER_ID, 1, "Cell division gives rise to genetically identical cells in which the total number of chromosomes is maintained.");
    await embedAndInsert(DOC_A_ID, TEST_USER_ID, 2, "In general, mitosis (division of the nucleus) is preceded by the S stage of interphase.");

    // Math Chunks
    await embedAndInsert(DOC_B_ID, TEST_USER_ID, 0, "Calculus is the mathematical study of continuous change. It has two major branches: differential calculus and integral calculus.");
    await embedAndInsert(DOC_B_ID, TEST_USER_ID, 1, "The fundamental theorem of calculus relates the two branches.");

    // Hindi/Hinglish Chunks
    await embedAndInsert(DOC_C_ID, TEST_USER_ID, 0, "Mera naam Rahul hai aur main ek software engineer hoon.");
    await embedAndInsert(DOC_C_ID, TEST_USER_ID, 1, "Ye project bahut important hai humari team ke liye.");
    
    // Failed Document Chunk (Should never be retrieved because document status is FAILED)
    await embedAndInsert(DOC_FAIL_ID, TEST_USER_ID, 0, "Secret failed document that should not appear in search results.");

    // Unauthorized Document Chunk (Belongs to UNAUTH_USER_ID, TEST_USER_ID should never see it)
    await embedAndInsert(DOC_UNAUTH_ID, UNAUTH_USER_ID, 0, "This is top secret information owned by another user. Mitosis.");
  }

  async function cleanupFixtures() {
    console.log("\n🧹 Cleaning up test fixtures in dependency order...");
    try {
      await prisma.user.deleteMany({ where: { id: { in: [TEST_USER_ID, UNAUTH_USER_ID] } } });
      console.log("🧹 Cleanup complete.");
    } catch (e) {
      console.warn("⚠️ Cleanup failed (likely DB connection issue):", (e as Error).message);
    } finally {
      await prisma.$disconnect();
    }
  }

  try {
    await setupFixtures();
    
    console.log("\n🚀 Running RAG Evaluation Suite...\n");

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
    const contents = results.filter(r => r.documentId === DOC_A_ID).map(r => r.content as string);
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
    assert(results.some(r => r.documentId === DOC_A_ID || r.documentId === DOC_B_ID), "Multi-topic query retrieves at least one relevant document.");

    // 11. Unauthorized User Isolation
    // Querying for "mitosis" should ONLY return DOC_A_ID (TEST_USER_ID's doc), never DOC_UNAUTH_ID (UNAUTH_USER_ID's doc), 
    // even though DOC_UNAUTH_ID explicitly contains the word "Mitosis."
    results = await searchKnowledgeBase("mitosis", TEST_USER_ID);
    assert(
      !results.some(r => r.documentId === DOC_UNAUTH_ID), 
      "Strict ownership isolation: Unauthorized documents are completely hidden from retrieval."
    );

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed.`);
    console.log("Note: Query rewriting logic resides in the API router and is intentionally bypassed in this pure retrieval evaluation.");
    
    if (failed > 0) throw new Error("Evaluation suite failed.");
  } catch (error) {
    console.error("Evaluation Error:", error);
    process.exitCode = 1;
  } finally {
    await cleanupFixtures();
  }
}

executeSuite();
