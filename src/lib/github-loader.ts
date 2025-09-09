import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github';
import "dotenv/config";
import { Document } from '@langchain/core/documents';
import { generateEmbedding, summarizeCode } from './gemini';
import { db } from '@/server/db';
import { buildFileTree, renderFileTree } from './build-tree';
import { Octokit } from 'octokit';

const getFileCount = async (path: string, octokit: Octokit, githubOwner: string, githubRepo: string, acc: number = 0) => {
  const { data } = await octokit.rest.repos.getContent({
    owner: githubOwner,
    repo: githubRepo,
    path
  });

  if (!Array.isArray(data) && data.type === 'file') {
    return acc + 1;
  }

  if (Array.isArray(data)) {
    let fileCount = 0;
    const directories: string[] = [];

    for (const item of data) {
      if (item.type === 'dir') {
        directories.push(item.path);
      } else {
        fileCount++;
      }
    }

    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dirPath) => getFileCount(dirPath, octokit, githubOwner, githubRepo, 0))
      );
      fileCount += directoryCounts.reduce((acc, count) => acc + count, 0);
    }

    return acc + fileCount;
  }

  return acc;
};

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
  // find out how many files are in the repo
  const octokit = new Octokit({ auth: githubToken });
  const githubOwner = githubUrl.split('/')[3];
  const githubRepo = githubUrl.split('/')[4];
  if (!githubOwner || !githubRepo) {
    return 0;
  }
  const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0);
  return fileCount;
};

/**
 * Load GitHub repo dynamically using its default branch
 */
export const loadGitHubRepo = async (githubUrl: string, gitHubToken?: string) => {
    // Extract owner and repo from URL
    const match = githubUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git|\/)?$/);
    if (!match) throw new Error("Invalid GitHub URL");
    const owner: string = match[1]!;
    const repo: string = match[2]!;

    // Initialize Octokit with token if provided
    const octokit = new Octokit({ auth: gitHubToken || process.env.GITHUB_TOKEN });

    // Fetch repository info to get default branch
    let defaultBranch = 'main';
    try {
      const { data } = await octokit.rest.repos.get({ owner, repo });
      defaultBranch = data.default_branch; // could be 'main' or 'master'
    } catch (err) {
      console.warn(`Failed to fetch default branch for ${owner}/${repo}. Falling back to 'main'`);
    }

    // Load repo via LangChain loader
    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: gitHubToken || process.env.GITHUB_TOKEN,
      branch: defaultBranch,
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
};


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


