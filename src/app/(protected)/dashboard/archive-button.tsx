'use client'

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import useProject from "@/hooks/use-project"
import useRefetch from "@/hooks/use-refetch"
import { api } from "@/trpc/react"
import { toast } from "sonner"

const ArchiveButton = () => {
  const archiveProject = api.project.archiveProject.useMutation()
  const { projectId } = useProject()
  const refetch = useRefetch()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={archiveProject.isPending}
          className="hover:cursor-pointer"
          size="sm"
          variant="destructive"
        >
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to archive this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will move the project to the archived state. You cannot restore it later once archived.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              archiveProject.mutate(
                { projectId },
                {
                  onSuccess: () => {
                    toast.success("Project deleted successfully!")
                    refetch()
                  },
                  onError: () => {
                    toast.error("Failed to archive project")
                  },
                }
              )
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Yes, archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ArchiveButton
