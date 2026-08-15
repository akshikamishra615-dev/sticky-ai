import { createGroq } from "@ai-sdk/groq";
import { generateObject, streamText } from "ai";
import { z } from "zod";

const systemPrompt = `You are Sticky AI, a helpful educational AI assistant designed for students.

Your goal is to explain concepts clearly and accurately.

Prefer:
- Simple explanations first
- Examples
- Step-by-step reasoning
- Useful analogies
- Concise answers unless the student asks for depth

When appropriate, suggest:
- A quick quiz
- Practice questions
- A study plan
- Related concepts

Do not pretend to know information you are uncertain about.
For academic questions, prioritize correctness.`;

export const noteSchema = z.object({
  title: z.string(),
  subject: z.string(),
  topic: z.string(),
  description: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string()
  }).strict()),
  visualLearning: z.object({
    type: z.enum(['table', 'flowchart', 'diagram', 'concept_map', 'timeline']),
    content: z.string()
  }).strict().nullish().default(null)
}).strict();

export const quizSchema = z.object({
  title: z.string(),
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctAnswerIndex: z.number(),
    explanation: z.string()
  }).strict())
}).strict();

export const studyPlanSchema = z.object({
  title: z.string(),
  sessions: z.array(z.object({
    day: z.string(),
    durationMins: z.number(),
    topic: z.string(),
    tasks: z.array(z.string())
  }).strict())
}).strict();

function getGroqModel() {
  const modelName = process.env.GROQ_MODEL;
  if (!modelName) {
    throw new Error("Server configuration error: GROQ_MODEL is missing in environment variables.");
  }
  
  const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY
  });
  
  return groq(modelName);
}

export async function generateEducationalNote(subject: string, topic: string, config: { style?: string, instructions?: string, educationMetadata?: Record<string, string> }) {
  const taxonomyContext = config.educationMetadata 
    ? Object.entries(config.educationMetadata).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join('\n')
    : '';

  const prompt = `Generate an educational study note for a student.
Subject: ${subject}
Topic: ${topic}
${taxonomyContext ? `\n--- EDUCATION CONTEXT ---\n${taxonomyContext}\n----------------------\n` : ''}
Style preference: ${config.style || 'General Study'}
Additional instructions: ${config.instructions || 'None'}

CRITICAL INSTRUCTIONS FOR NOTE LENGTH AND QUALITY:
- Target word count: 300 to 800 words maximum. Be CONCISE.
- Avoid repetitive explanations and generic filler.
- Do NOT generate empty sections. If a section has no meaningful content, omit it entirely.
- Prioritize bullet points, short paragraphs, and practical examples.

STRUCTURE:
Follow this structure strictly:
1. Overview (2-4 sentences max)
2. Key Concepts (4-8 concise bullets)
3. Detailed Explanation (broken into small subsections)
4. Example (practical or code example)
5. Important Points (highlighted takeaways)
6. Quick Summary (3-5 bullets)
7. Practice Questions (3-5 questions)

VISUAL LEARNING:
If the topic benefits from a visual representation (like a table, flowchart, timeline, or concept map), generate a 'visualLearning' object. Use simple Markdown formatting inside the visual content string (e.g., Markdown tables or textual flow arrows like A -> B -> C). Do NOT use image URLs.
If a visual representation is not needed, you MUST output null for the 'visualLearning' field.

Ensure the content is factually accurate, well-structured, and genuinely topic-specific.`;

  const result = await generateObject({
    model: getGroqModel(),
    system: systemPrompt,
    schema: noteSchema,

    prompt: `${prompt}
    
You MUST output a JSON object exactly matching this structure:
{
  "title": "string",
  "subject": "string",
  "topic": "string",
  "description": "string",
  "sections": [
    {
      "title": "string",
      "content": "string"
    }
  ],
  "visualLearning": {
    "type": "table | flowchart | diagram | concept_map | timeline",
    "content": "string"
  } // or null
}
`
  });

  return result.object;
}

export async function generateQuiz(topic: string, difficulty: string) {
  const result = await generateObject({
    model: getGroqModel(),
    system: systemPrompt,
    schema: quizSchema,

    prompt: `Generate a multiple choice quiz about ${topic}. Difficulty: ${difficulty}. Include 3-5 questions.
    
You MUST output a JSON object exactly matching this structure:
{
  "title": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": 0,
      "explanation": "string"
    }
  ]
}
`
  });
  return result.object;
}

export async function generateStudyPlan(subject: string, topic: string, timeframe: string) {
  const result = await generateObject({
    model: getGroqModel(),
    system: systemPrompt,
    schema: studyPlanSchema,

    prompt: `Create a study plan for ${subject}: ${topic} over a timeframe of ${timeframe}.
    
You MUST output a JSON object exactly matching this structure:
{
  "title": "string",
  "sessions": [
    {
      "day": "string",
      "durationMins": 30,
      "topic": "string",
      "tasks": ["string", "string"]
    }
  ]
}
`
  });
  return result.object;
}

export async function createChatStream(
  messages: { role: 'user' | 'assistant', content: string }[],
  options?: {
    ragContext?: string;
    language?: string;
    userProfileMetadata?: Record<string, string>;
    onFinish?: (event: { text: string }) => Promise<void> | void;
  }
) {
  const { ragContext, language, userProfileMetadata, onFinish } = options || {};

  let finalSystemPrompt = systemPrompt;

  if (userProfileMetadata) {
    const profileContext = Object.entries(userProfileMetadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    finalSystemPrompt += `\n\nUSER PROFILE:\n${profileContext}`;
  }

  if (ragContext) {
    finalSystemPrompt = `You are Sticky AI, an educational assistant.

The user has enabled Knowledge Base mode. You must answer their question PRIMARILY using the provided context below.
- Do not invent facts.
- Distinguish clearly between document content and general knowledge.
- CITE RELEVANT SOURCES (e.g. "Source: Operating Systems.pdf") at the end of your answer.
- If the context is completely insufficient to answer the question, explicitly say so and offer to answer using general knowledge.
- You must use the retrieved context regardless of what language the context is in.

--- RETRIEVED CONTEXT ---
${ragContext}
--- END CONTEXT ---`;
  }
  
  // Multilingual Rules
  let langRule = `
- Detect the user's language automatically.
- Answer in the user's language by default. If they speak in Hinglish, respond in Hinglish/Hindi naturally.
- Preserve technical terms where translation would reduce clarity.`;

  if (language && language !== 'Auto Detect') {
    langRule = `
- The user has EXPLICITLY requested that you answer in the following language: ${language}.
- You MUST answer entirely in ${language} (except for technical terms where translation reduces clarity).`;
  }

  finalSystemPrompt += `\n\nLANGUAGE RULES:${langRule}`;

  return streamText({
    model: getGroqModel(),
    system: finalSystemPrompt,
    messages,
    onFinish,
    onError: (error) => {
      console.error("[createChatStream] Error during streaming:", error);
    }
  });
}
