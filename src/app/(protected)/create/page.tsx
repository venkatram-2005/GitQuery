'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import useRefetch from '@/hooks/use-refetch'
import ProjectProgressDialog from './progress-component'
import CommitProgressDialog from './commit-progress-component' // new dialog for commits
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'

type FormInput = {
  repoUrl: string
  projectName: string
  githubToken?: string
}

const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>()
  const createProject = api.project.createProject.useMutation()
  const checkCredits = api.project.checkCredits.useMutation()

  const refetch = useRefetch()
  const router = useRouter()

  const [progressOpen, setProgressOpen] = useState(false)
  const [commitOpen, setCommitOpen] = useState(false)

  function onSubmit(data: FormInput) {
    if (!!checkCredits.data) {
      setProgressOpen(true) // show file summarization modal
      createProject.mutate(
        {
          githubUrl: data.repoUrl,
          name: data.projectName,
          gitHubToken: data.githubToken,
        },
        {
          onSuccess: async () => {
            setProgressOpen(false) // close file modal
            toast.success('Files summarized successfully. Just a few seconds more !!!')
            setCommitOpen(true)    // open commits modal

            // simulate commits summarization
            await new Promise((res) => setTimeout(res, 25000)) // adjust delay as needed

            setCommitOpen(false) // close commit modal
            toast.success('Project created successfully')
            refetch()
            reset()
            router.push('/dashboard')
          },
          onError: (error) => {
            setProgressOpen(false)
            toast.error(`Error creating project: ${error.message}`)
          },
        }
      )
    }
    else {
      checkCredits.mutate({
        githubUrl: data.repoUrl,
        githubToken: data.githubToken
      })
    }
  }

  return (
    <div className='flex items-center gap-12 h-full justify-center'>
      <img src="/undraw_programming.svg" alt="logo" className='h-56 w-auto' />
      <div>
        <div>
          <h1 className='font-semibold text-2xl'>Link your GitHub Repository</h1>
          <p className='text-sm text-muted-foreground'>
            Enter the URL of your GitHub repository to link it with GitQuery
          </p>
        </div>
        <div className='h-4'></div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input {...register('projectName', { required: true })} placeholder='Project Name' required />
          <div className='h-2'></div>
          <Input {...register('repoUrl', { required: true })} placeholder='GitHub repository URL' type='url' required />
          <div className='h-2'></div>
          <Input {...register('githubToken')} placeholder='Github Token (optional)' />

          {checkCredits.data && (
            <>
              <div className="mt-4 bg-orange-50 px-4 py-2 rounded-md border border-orange-200 text-orange-700">
                <div className="flex items-center gap-2">
                  <Info className='size-4' />
                  <p className='text-sm'>You will be charged <strong>{checkCredits.data?.fileCount}</strong> credits for this repository</p>
                </div>
                <p className='text-sm text-blue-600 ml-6'>You have <strong>{checkCredits.data?.userCredits}</strong> credits remaining</p>
              </div>
            </>
        )}

          <div className='h-4'></div>
          <Button type='submit' disabled={createProject.isPending || checkCredits.isPending} className='hover:cursor-pointer'>
              {!!checkCredits.data ? 'Create Project' : 'Check Credits'}
          </Button>
        </form>
      </div>

      {/* File Summary Modal */}
      <ProjectProgressDialog 
        open={progressOpen} 
        onClose={() => setProgressOpen(false)} 
      />

      {/* Commit Summary Modal */}
      <CommitProgressDialog
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
      />

    </div>
  )
}

export default CreatePage
