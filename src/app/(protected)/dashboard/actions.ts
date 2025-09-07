'use server'

import {generateText} from 'ai';
import {createGoogleGenerativeAI} from '@ai-sdk/google' 
import "dotenv/config";
import { generateEmbedding } from '@/lib/gemini';
import { db } from '@/server/db';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY_FOR_QUE
})

export async function askQuestion(question: string, projectId: string){

    const queryVector = await generateEmbedding(question);
    const vectorQuery = `[${queryVector.join(',')}]`
    // Using only cosine similarity
    // const result = await db.$queryRaw`
    //     SELECT "fileName", "sourceCode", "summary",
    //     1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
    //     FROM "SourceCodeEmbedding"
    //     WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > .1
    //     AND "projectId" = ${projectId}
    //     ORDER BY similarity DESC
    //     LIMIT 10
    // ` as { fileName: string; sourceCode: string; summary: string }[];

    // 2. Hybrid retrieval: cosine + BM25
    const results = await db.$queryRaw`
        SELECT
        "fileName",
        "sourceCode",
        "summary",

        1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS cosine_score,

        ts_rank_cd(
            to_tsvector('english', "sourceCode" || ' ' || "summary"),
            plainto_tsquery(${question})
        ) AS bm25_score,

        (1 - ("summaryEmbedding" <=> ${vectorQuery}::vector)) * 0.6
        + ts_rank_cd(
            to_tsvector('english', "sourceCode" || ' ' || "summary"),
            plainto_tsquery(${question})
            ) * 0.4 AS hybrid_score

        FROM "SourceCodeEmbedding"
        WHERE "projectId" = ${projectId}
        ORDER BY hybrid_score DESC
        LIMIT 10;
    ` as {
        fileName: string;
        sourceCode: string;
        summary: string;
        hybrid_score: number;
    }[];

    let context = '';

    for (const doc of results) {
        context += `source: ${doc.fileName} \n code content : ${doc.sourceCode} \n Summary of the file: ${doc.summary}\n\n`
    }

    const {text} = await generateText({
        model: google('gemini-2.5-flash'), 
        prompt: `
        You are an AI code assistant who answers questions about the codebase.  
        Your target audience is a technical intern who is learning and contributing to the repository.  

        The AI assistant is a brand new, powerful, human-like artificial intelligence.  
        The traits of the AI include expert knowledge, helpfulness, cleverness, and articulateness.  
        The AI is a well-behaved and well-mannered individual.  
        The AI is always friendly, kind, and inspiring, and is eager to provide vivid and thoughtful responses to the user.  
        The AI has the sum of all programming and technical knowledge, and is able to accurately answer nearly any question about the repository.  

        If the question is about code or a specific file, the AI will provide a detailed answer with step-by-step explanations.  

        START CONTEXT BLOCK  
        ${context}  
        END OF CONTEXT BLOCK  

        START QUESTION  
        ${question}  
        END OF QUESTION  
        The AI assistant will take into account any CONTEXT BLOCK provided in a conversation.  
        If the context does not provide the answer to the question, the AI assistant will say:  
        "I'm sorry, but I don’t know the answer based on the given context."  

        The AI assistant will not apologize for previous responses but instead will indicate when new information was gained.  
        The AI assistant will not invent anything that is not drawn directly from the context or established programming knowledge.  

        Answer in **Markdown syntax**, using **code snippets when helpful**.  
        Be as detailed as possible when answering, ensuring clarity for junior developers and interns.  
        Always break down solutions into **step-by-step reasoning** so that the user can follow along and learn.
            `
    });
    console.log(text);
    return{
        output: text, 
        filesReferenced: results
    }
} 