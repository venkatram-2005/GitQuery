import React, { useState } from "react";
import { useFileTree } from "@/hooks/use-filetree";
import { Button } from "@/components/ui/button"; // shadcn Button
import { ChevronDown, ChevronUp } from "lucide-react"; // icons for collapse

interface FileTreeViewerProps {
  projectId?: string;
  title?: string; // optional card title
}

export default function FileTreeViewer({ projectId, title = "Extracted Project File Tree" }: FileTreeViewerProps) {
  const { data, isLoading, error } = useFileTree(projectId);
  const [isOpen, setIsOpen] = useState(true);

  // Toggle collapse
  const toggle = () => setIsOpen(!isOpen);

  return (
    <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={toggle}>
        <h3 className="text-white font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" className="p-1">
          {isOpen ? <ChevronUp className="w-4 h-4 text-white hover:cursor-pointer" /> : <ChevronDown className="w-4 h-4 text-white hover:cursor-pointer" />}
        </Button>
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="p-4 bg-black/50">
          {/* Case: No project selected */}
          {!projectId && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 italic">No project selected</p>
            </div>
          )}

          {/* Case: Loading */}
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-black rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading tree...</p>
              </div>
            </div>
          )}

          {/* Case: Error */}
          {error && (
            <div className="flex items-center justify-center h-32">
              <p className="text-red-500 text-sm">Error: {error.message}</p>
            </div>
          )}

          {/* Case: No data */}
          {!isLoading && !error && !data && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 italic">Project structure not available</p>
            </div>
          )}

          {/* Case: Show file tree */}
          {data && !isLoading && !error && (
            <pre className="bg-gray-900 text-green-300 p-4 rounded-lg overflow-auto text-sm font-mono">
              {data}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
