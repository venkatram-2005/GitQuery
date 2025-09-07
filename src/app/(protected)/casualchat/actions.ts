'use server';

import { db } from "@/server/db";
import { generateEmbedding } from '@/lib/gemini';
import { generateText } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// LangChain-based chunker
async function chunkText(text: string, chunkSize = 1000, overlap = 200): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: overlap,
  });

  const docs = await splitter.createDocuments([text]);
  return docs.map(doc => doc.pageContent);
}

export async function askCasualQuestion(question: string, projectId: string) {
  // 1. Get the combined summary from DB
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { 
      //@ts-ignore
      combinedSummary: true 
    },
  });
  //@ts-ignore
  if (!project?.combinedSummary) {
    throw new Error("No combined summary available for this project");
  }

  // 2. Chunk the summary
  //@ts-ignore
  const chunks = await chunkText(project.combinedSummary);

  // 3. Embed the question
  const queryVector = await generateEmbedding(question);

  // 4. Embed all chunks
  const chunkEmbeddings = await Promise.all(
    chunks.map(async (chunk, i) => {
      const emb = await generateEmbedding(chunk);
      return { id: i, text: chunk, embedding: emb };
    })
  );

  // 5. Compute cosine similarity
  function cosineSim(a: number[], b: number[]): number {
    const dot = a.reduce((acc, val, i) => acc + val * b[i]!, 0);
    const normA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
    return dot / (normA * normB);
  }

  const scored = chunkEmbeddings.map((c) => ({
    ...c,
    score: cosineSim(queryVector, c.embedding),
  }));

  // 6. Take top 10 chunks
  const topChunks = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((c) => c.text);

  const context = topChunks.join("\n\n");

  // 7. Ask Gemini
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_GOLDEN_KEY!,
  });

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt: `
    You are an AI code assistant who answers questions about the project at a high level.  
    Instead of focusing on individual files, you will use the **summarized project overview**.  

    START CONTEXT BLOCK
    ${context}
    END OF CONTEXT BLOCK

    START QUESTION
    ${question}
    END OF QUESTION

    Rules:
    - Be clear, concise, and detailed when helpful.
    - Use markdown syntax in your answer.
    - Break down explanations into step-by-step reasoning if the question involves processes.
    - If the answer cannot be found in the context, respond with:
      "I'm sorry, but I don’t know the answer based on the given context."
    `,
  });

  return text;
}
