import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummarizeCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const githubUrl = "https://github.com/docker/genai-stack";

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  // https://github.com/venkatram-2005/Portfolio
  // Extract owner and repo from the GitHub URL
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  });
  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  );

  // Adjust the number of commits to return as needed
  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit.author?.name ?? "",
    commitAuthorAvatar:
      commit.author?.avatar_url ?? "https://avatars.githubusercontent.com/u/19948365?v=4",
    commitDate: commit.commit.author?.date ?? "",
  }));
};

// export const pollCommits = async (projectId: string) => {
//   const { project, githubUrl } = await fetchProjectGitHUbUrl(projectId);
//   const commitHashes = await getCommitHashes(githubUrl);
//   const unprocessesdCommits = await filterUnprocessesdCommits(
//     projectId,
//     commitHashes,
//   );

//   const summaryResponses = await Promise.allSettled(
//     unprocessesdCommits.map(async (commit) => {
//       try {
//         return await summarizeCommit(githubUrl, commit.commitHash);
//       } catch (err) {
//         console.error(`❌ Error summarizing commit ${commit.commitHash}:`, err);
//         throw err; // so it still goes into rejected branch
//       }
//     }),
//   );

//   const summaries = summaryResponses.map((response, index) => {
//     if (response.status === "fulfilled") {
//       return response.value as string;
//     }
//     return "Error generating summary for commit";
//   });

//   const commits = await db.commit.createMany({
//     //@ts-ignore
//     data: summaries.map((summary, index) => {
//       console.log(`Processing commit ${index + 1} of ${summaries.length}`);
//       return {
//         projectId: projectId,
//         commitHash: unprocessesdCommits[index]!.commitHash,
//         commitMessage: unprocessesdCommits[index]!.commitMessage,
//         commitAuthorName: unprocessesdCommits[index]!.commitAuthorName,
//         commitAuthorAvatar: unprocessesdCommits[index]!.commitAuthorAvatar,
//         commitDate: unprocessesdCommits[index]!.commitDate,
//         summary,
//       };
//     }),
//   });

//   return commits;
// };

export const pollCommits = async (projectId: string) => {
  const { project, githubUrl } = await fetchProjectGitHUbUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessesdCommits = await filterUnprocessesdCommits(
    projectId,
    commitHashes,
  );

  const summaries: string[] = [];

  for (let i = 0; i < unprocessesdCommits.length; i++) {
    const commit = unprocessesdCommits[i];
    try {
      console.log(`Processing commit ${i + 1} of ${unprocessesdCommits.length}`);
      const summary = await summarizeCommit(githubUrl, commit!.commitHash);
      summaries.push(summary);
      // Optional: add small delay between API calls
      await new Promise(res => setTimeout(res, 2500)); // 0.5s delay
    } catch (err) {
      console.error(`❌ Error summarizing commit ${commit!.commitHash}:`, err);
      summaries.push("Error generating summary for commit");
    }
  }

  const commits = await db.commit.createMany({
    //@ts-ignore
    data: summaries.map((summary, index) => {
      const commit = unprocessesdCommits[index]!;
      return {
        projectId,
        commitHash: commit.commitHash,
        commitMessage: commit.commitMessage,
        commitAuthorName: commit.commitAuthorName,
        commitAuthorAvatar: commit.commitAuthorAvatar,
        commitDate: commit.commitDate,
        summary,
      };
    }),
  });

  return commits;
};

const summarizeCommit = async (githubUrl: string, commitHash: string) => {
  const diffUrl = `${githubUrl}/commit/${commitHash}.diff`;
  const res = await fetch(diffUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch diff: ${res.status} ${res.statusText}`);
  }

  const diff = await res.text();
  if (!diff.trim()) {
    throw new Error(`Empty diff for commit ${commitHash}`);
  }

  return aiSummarizeCommit(diff);
};

async function fetchProjectGitHUbUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      githubUrl: true,
    },
  });
  if (!project?.githubUrl) {
    throw new Error("Project has no github url");
  }
  return { project, githubUrl: project?.githubUrl };
}

async function filterUnprocessesdCommits(
  projectId: string,
  commitHashes: Response[],
) {
  //@ts-ignore
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  const unprocessesdCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit: any) =>
          processedCommit.commitHash === commit.commitHash,
      ),
  );
  return unprocessesdCommits;
}

// await pollCommits("cmf1uoanr0006bwc493rt999a").then(console.log);
