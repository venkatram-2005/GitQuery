import { api } from "@/trpc/react";

export function useFileTree(projectId?: string) {
  return api.project.getFileTree.useQuery(
    projectId ? { projectId } : { projectId: "" }, // always a string
    {
      enabled: Boolean(projectId), // query won't run until projectId exists
    }
  );
}
