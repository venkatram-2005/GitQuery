'use client'

import useProject from '@/hooks/use-project'
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogHeader, DialogContent } from '@/components/ui/dialog'
import Image from 'next/image'
import MDEditor from '@uiw/react-md-editor'
import { toast } from 'sonner'
import { askCasualQuestion } from './actions'

// 🌀 Simple loading spinner
const Spinner = () => (
  <div className="flex justify-center items-center h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
  </div>
)

const AskQuestionCardCasualChat = () => {
  const { project } = useProject()
  const [question, setQuestion] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [answer, setAnswer] = React.useState('')
  const [streamingAnswer, setStreamingAnswer] = React.useState('')

  const fakeStream = (text: string) => {
    setStreamingAnswer(text)
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAnswer('')
    setStreamingAnswer('')
    if (!project?.id) return
    setLoading(true)
    setOpen(true)

    try {
      const output = await askCasualQuestion(question, project.id)
      setAnswer(output)
      fakeStream(output)
    } catch (err) {
      console.error(err)
      toast.error('Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[100vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                <Image src="/logo.png" alt="gitquery" width={40} height={40} />
              </DialogTitle>
            </div>
          </DialogHeader>

          {loading ? (
            <Spinner />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              <div className="border rounded-md p-2 bg-gray-50">
                <MDEditor.Markdown
                  source={streamingAnswer}
                  className="prose max-w-none"
                />
              </div>
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
            <span>Ask a casual question to GitQuery about the repo:</span>
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
              <Button type="submit" className="hover:cursor-pointer">
                Ask GitQuery !
              </Button>
              
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

export default AskQuestionCardCasualChat
