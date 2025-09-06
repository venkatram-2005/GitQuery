"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/trpc/react"
import { useEffect, useState } from "react"

type Props = {
  open: boolean
  onClose: () => void
}

export default function ProjectProgressDialog({ open, onClose }: Props) {
  const { data, refetch } = api.project.getProgress.useQuery(undefined, {
    enabled: open,
    refetchInterval: 2000,
  })

  const [hasStarted, setHasStarted] = useState(false)

  // Trigger immediate fetch on open
  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])

  // Detect when summarization starts
  useEffect(() => {
    //@ts-ignore
    if (data?.currentProjectId || data?.currentFile) {
      setHasStarted(true)
    }
  }, [data])

  // Auto-close only after processing has started and all files are done
  useEffect(() => {
    //@ts-ignore
    if (open && hasStarted && !data?.currentProjectId && !data?.currentFile) {
      onClose()
      setHasStarted(false)
    }
  }, [data, open, onClose, hasStarted])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Summarizing Repository Files</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-transparent rounded-full"></div>
          <p className="text-sm text-gray-600">
            {
              //@ts-ignore
              data?.currentFile
              ? `Currently summarizing: ${
                //@ts-ignore
                data.currentFile
              }`
              : "Preparing repository..."
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
