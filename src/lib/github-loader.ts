import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github';
import "dotenv/config";
import { Document } from '@langchain/core/documents';
import { generateEmbedding, summarizeCode } from './gemini';
import { db } from '@/server/db';

export const loadGitHubRepo = async (githubUrl: string, gitHubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: process.env.GITHUB_TOKEN || gitHubToken,
        branch: 'main',
        ignoreFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules/**', 'dist/**', 'build/**', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'mp4', 'mp3', '.pbix'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
    });
    const docs = await loader.load();
    return docs;
    
}

// console.log(await loadGitHubRepo('https://github.com/venkatram-2005/Portfolio'));

//  Document {
//     pageContent: 'Actual source code',
//     metadata: {
//       source: 'src/components/TechIcon.tsx',
//       repository: 'https://github.com/venkatram-2005/Portfolio',
//       branch: 'main'
//     },
    // id: undefined


export const indexGithubRepo = async (projectId : string, githubUrl: string, gitHubToken?: string) => {
    const docs = await loadGitHubRepo(githubUrl, gitHubToken)
    const allEmbeddings = await generateEmbeddings(docs);
    await Promise.allSettled(allEmbeddings.map(async (embedding, index) => {
        console.log(`Processing embedding ${index + 1} of ${allEmbeddings.length}`)
        if(!embedding) return;
        //@ts-ignore
        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
                fileName: embedding.fileName,
                projectId,
            }
        })

        await db.$executeRaw`
            UPDATE "SourceCodeEmbedding"
            SET "summaryEmbedding" = ${embedding.embedding}::vector
            WHERE "id" = ${sourceCodeEmbedding.id}
        `
    }))
    
}

const generateEmbeddings = async (docs: Document[]) => {   // file is called document in langchain
    return await Promise.all(docs.map(async doc => {
        const summary = await summarizeCode(doc);
        const embedding = await generateEmbedding(summary);
        return {
            summary, 
            embedding, 
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source,
        }
    }))
}
