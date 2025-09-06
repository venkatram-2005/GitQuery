'use client'

import useProject from '@/hooks/use-project'
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogHeader, DialogContent } from '@/components/ui/dialog'
import Image from 'next/image'
import { askQuestion } from './actions'
import MDEditor from '@uiw/react-md-editor'
import CodeReferences from './code-references'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import useRefetch from '@/hooks/use-refetch'

// 🌀 Simple loading spinner
const Spinner = () => (
  <div className="flex justify-center items-center h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
  </div>
)



const AskQuestionCard = () => {
  const { project } = useProject()
  const [question, setQuestion] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [filesReferences, setFilesReferences] = React.useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([])
  const [answer, setAnswer] = React.useState('')
  const [streamingAnswer, setStreamingAnswer] = React.useState('')
  const saveAnswer = api.project.saveAnswer.useMutation()

  const fakeStream = (text: string) => {
    setStreamingAnswer(text)
  }

   // 📝 AI Rewrite mutation
  const rewriteMutation = api.rewrite.rewriteWithAI.useMutation({
    onSuccess: (data) => {
      setQuestion(data.rewrittenText)
      toast.success("Rewritten with AI ✨")
    },
    onError: () => {
      toast.error("Failed to rewrite text")
    },
  })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAnswer('')
    setStreamingAnswer('')
    setFilesReferences([])
    if (!project?.id) return
    setLoading(true)
    setOpen(true)

    try {
      const { output, filesReferenced } = await askQuestion(question, project.id)
      setFilesReferences(filesReferenced)
      setAnswer(output)

      // 👉 simulate streaming instead of dumping text at once
      fakeStream(output)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const refetch = useRefetch()

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[100vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                <Image src="/logo.png" alt="gitquery" width={40} height={40} />
              </DialogTitle>
              <Button
                className='hover:cursor-pointer'
                disabled={saveAnswer.isPending}
                variant="outline"
                onClick={() => {
                  saveAnswer.mutate(
                    {
                      projectId: project!.id,
                      question,
                      answer,
                      filesReferences,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer saved !");
                        refetch();
                      },
                      onError: () => {
                        toast.error("Failed to save answer");
                      },
                    }
                  );
                }}
              >
                Save Answer
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <Spinner />
          ) : (
            // 🔑 Make whole content scrollable
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              <div className="border rounded-md p-2 bg-gray-50">
                <MDEditor.Markdown
                  source={streamingAnswer}
                  className="prose max-w-none"
                />
              </div>

              <CodeReferences filesReferences={filesReferences} />

              <div className="flex justify-end">
                <Button type="button" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="relative col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Image src="/logo.png" alt="gitquery" width={40} height={40} />
            <span>Ask a question</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              placeholder="Which file should I edit to change the home page ?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <div className="h-4"></div>
            <div className="flex items-center gap-4">
                <Button
                  type="button"
                  className="hover:cursor-pointer flex items-center gap-2"
                  onClick={() => rewriteMutation.mutate({ text: question })}
                  disabled={rewriteMutation.isPending}
                >
                  {rewriteMutation.isPending && (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  )}
                  Rewrite With AI
                </Button>

                <Button type="submit" className="hover:cursor-pointer">Ask GitQuery!</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

export default AskQuestionCard
