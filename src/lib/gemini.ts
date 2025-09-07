// groq.ts
import OpenAI from "openai";
import type { Document } from "@langchain/core/documents";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ---- Gemini client (for embeddings only) ----
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1!);

// ✅ Embeddings stay on Gemini
export async function generateEmbedding(summary: string) {
  const model = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });
  const result = await model.embedContent(summary);
  return result.embedding.values;
}

// ---- Groq client ----
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY_1,
  baseURL: "https://api.groq.com/openai/v1",
});

// choose Groq chat model
const CHAT_MODEL = "moonshotai/kimi-k2-instruct";

// ✅ Summarize code file using Groq
export async function summarizeCode(doc: Document) {
  console.log("Getting summary for", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 40000);
    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent senior software engineer who specializes in helping junior software engineers understand the projects better",
        },
        {
          role: "user",
          content: `You are in charge of explaining them the purpose of the ${doc.metadata.source} file.
            Here is the code
            ---
            ${code}
            ---
                        Give a summary of no more than 200 words of the code above clearly explaining the components and functionalities of the code. Do mention the function names or components if present.`,
        },
      ],
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    return " ";
  }
}

// ---- Groq client for commits ----
const groq_for_commits = new OpenAI({
  apiKey: process.env.GROQ_API_KEY_2,
  baseURL: "https://api.groq.com/openai/v1",
});

// ✅ Summarize git diff using Groq
export const aiSummarizeCommit = async (diff: string) => {
  if (typeof diff !== "string") {
    diff = JSON.stringify(diff, null, 2);
  }
  console.log("Diff preview:", diff.slice(0, 300));
  const MAX_CHARS = 8000; // safe cutoff depending on commit size
  diff = diff.length > MAX_CHARS ? diff.slice(0, MAX_CHARS) : diff;

  const response = await groq_for_commits.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert programmer, and you are trying to summarize a git diff in detailed points.

                Reminders about the git diff format:

                For every file, there are a few metadata lines, like (for example):
                diff --git a/lib/index.js b/lib/index.js
                index aadf691..bfef603 100644
                --- a/lib/index.js
                +++ b/lib/index.js
                This means that lib/index.js was modified in this commit. Note that this is only an example.

                Then there is a specifier of the lines that were modified.

                A line starting with + means it was added.

                A line that starting with - means that line was deleted.

                A line that starts with neither + nor - is code given for context and better understanding.

                It is not part of the diff.

                [...]

                EXAMPLE SUMMARY COMMENTS:
                * Raised the amount of returned recordings from 10 to 100 [packages/server/recordings_api.ts], [packages/server/constants.ts]  
                * Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]  
                * Moved the octokit initialization to a separate file [src/octokit.ts], [src/index.ts]  
                * Added an OpenAI API for completions [packages/utils/apis/openai.ts]  
                * Lowered numeric tolerance for test files

                Most commits will have less comments than this examples list.

                The last comment does not include the file names.

                Do not include parts of the example in your summary.

                It is given only as an example of appropriate comments.`,
      },
      {
        role: "user",
        content: `Please summarise the following diff file:  \n\n ${diff}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
};
