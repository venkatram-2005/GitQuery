import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github';
import "dotenv/config";
import { Document } from '@langchain/core/documents';
import { generateEmbedding, summarizeCode } from './gemini';
import { db } from '@/server/db';
import { buildFileTree, renderFileTree } from './build-tree';

export const loadGitHubRepo = async (githubUrl: string, gitHubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: process.env.GITHUB_TOKEN || gitHubToken,
        branch: 'main',
        ignoreFiles: [
            'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'node_modules/**', 'dist/**', 'build/**',
            '*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.mp4', '*.mp3', '*.pbix'
        ],
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


export const indexGithubRepo = async (projectId : string, userId : string, githubUrl: string, gitHubToken?: string) => {
    const docs = await loadGitHubRepo(githubUrl, gitHubToken)
    const fileTreeObj = buildFileTree(docs);
    const fileTreeStr = renderFileTree(fileTreeObj);
    console.log(fileTreeStr);
    await db.project.update({
      where: { id: projectId },
      //@ts-ignore
      data: { fileTree: fileTreeStr },
    });
    
    const allEmbeddings = await generateEmbeddings(docs, projectId, userId);

      // Variable to collect all summaries
      const combinedSummaries: string[] = [];

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

        // Collect summary
        combinedSummaries.push(
          `📄 ${embedding.fileName}\n${embedding.summary}`
        );

        await db.$executeRaw`
            UPDATE "SourceCodeEmbedding"
            SET "summaryEmbedding" = ${embedding.embedding}::vector
            WHERE "id" = ${sourceCodeEmbedding.id}
        `
    }))
     // Join everything into one combined summary
    const finalSummary = combinedSummaries.join("\n\n");

    // Store at project level
    await db.project.update({
      where: { id: projectId },
      data: { 
        //@ts-ignore
        combinedSummary: finalSummary 
      },
    });

    return finalSummary;
}

const generateEmbeddings = async (docs: Document[], projectId: string, userId : string) => {
  const results = [];

  for (const doc of docs) {
    const fileName = doc.metadata.source;

    // 🔥 mark progress in User before summarizing
    await db.user.update({
      where: { id: userId },
      data: {
        currentProjectId: projectId,
        currentFile: fileName,
      } as any,
    });

    const summary = await summarizeCode(doc);
    const embedding = await generateEmbedding(summary);

    results.push({
      summary,
      embedding,
      sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
      fileName,
    });

    // small delay between requests
    await new Promise((res) => setTimeout(res, 2500));
  }

  // ✅ clear after finishing all
  await db.user.update({
    where: { id: userId },
    data: {
      currentProjectId: null,
      currentFile: null,
    }as any,
  });

  return results;
};


