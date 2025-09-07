// src/server/api/routers/rewrite.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import OpenAI from "openai"; // works with Groq SDK as well

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY_REWRITE, // or OPENAI_API_KEY depending on provider
  baseURL: "https://api.groq.com/openai/v1", // important for Groq
});

export const rewriteRouter = createTRPCRouter({
  rewriteWithAI: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const systemPrompt = `
            You are a skilled AI prompt writing assistant. 
            Your task is to rewrite any user-provided text into a clearer, more polished, and professional version, while fully preserving its original meaning and intent. 

            Guidelines:
            - Detect the language of the input automatically.  
            - If the input is in English, return the rewritten text in improved English.  
            - If the input is in another language, explicitly add an instruction at the beginning:  
            "Answer in <detected language>:"  
            Then rewrite the text in english with improved clarity, grammar, and tone.  
            - Make the rewritten text sound natural, concise, and easy to understand.  
            - Match the style and formality level of the original text.  
            - If the text is vague or incomplete, refine it into a coherent, meaningful version without altering the intended message.
            - Do not try to give any own answers and only modify the user prompt into a meaningful prompt
            - Prompt ideally contains a question in here for every scenario
            - Also consider that the questions asked are generally for better understanding of github repository code.
            `;

      const response = await client.chat.completions.create({
        model: "moonshotai/kimi-k2-instruct", // Groq model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.text },
        ],
        temperature: 0.7,
      });

      const rewrittenText =
        response.choices[0]?.message?.content ?? input.text;

      return { rewrittenText };
    }),
});
