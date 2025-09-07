import { Document } from "@langchain/core/documents";

export type FileNode = {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
};

export function buildFileTree(docs: Document[]): FileNode {
  const root: FileNode = { name: "root", type: "folder", children: [] };

  for (const doc of docs) {
    const pathParts = doc.metadata.source.split("/"); // e.g. ["src", "components", "TechIcon.tsx"]
    let current = root;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isFile = i === pathParts.length - 1;

      // find if already exists
      let node = current.children?.find((c) => c.name === part);
      if (!node) {
        node = {
          name: part,
          type: isFile ? "file" : "folder",
          ...(isFile ? {} : { children: [] }),
        };
        current.children?.push(node);
      }

      if (!isFile) {
        current = node;
      }
    }
  }

  return root;
}

export function renderFileTree(node: FileNode, prefix = ""): string {
  let result = prefix + node.name + "\n";

  if (node.children) {
    const lastIndex = node.children.length - 1;
    node.children.forEach((child, index) => {
      const isLast = index === lastIndex;
      const childPrefix =
        prefix + (node.name !== "root" ? (isLast ? "   " : "│  ") : "");
      const branch = node.name !== "root" ? (isLast ? "└─ " : "├─ ") : "";
      result += renderFileTree(child, childPrefix + branch);
    });
  }

  return result;
}
