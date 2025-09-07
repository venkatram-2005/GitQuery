'use client'

import React from 'react'
import useProject from '@/hooks/use-project'
import { Github, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import CommitLog from './commit-log'
import AskQuestionCard from './ask-question-card'
import ArchiveButton from './archive-button'
import InviteButton from './invite-button'
import TeamMembers from './team-members'
import FloatingTypewriterButton from './typewriter-button'
import FileTreeViewer from './file-structute'


const DashboardPage = () => {
    const { project } = useProject()

  return (
    <div>
      <div className='flex items-center justify-between flex-wrap gap-y-4'>

        {/* {github link} */}
        <div className='w-fit rounded-md bg-primary px-4 py-3 '>
          <div className='flex items-center'> 
            <Github className='size-5 text-white' />
            <div className='ml-2'>
              <div className='text-sm font-medium text-white'> 
                This project is linked to {' '}
                <Link 
                  href={project?.githubUrl ?? ""} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className='inline-flex items-center text-white/80 hover:underline'
                >
                  {project?.githubUrl}
                  <ExternalLink className='ml-1 size-4' />
                </Link>
              </div>
            </div>
          </div>
        </div> 

        <div className='h-4'></div>

        <div className='flex items-center gap-4'>
          <TeamMembers />
          <InviteButton />
          <ArchiveButton />
       </div>
      </div>

      <div className='h-4'></div>

      <div>
        <AskQuestionCard />
      </div>

      {/* <div className='h-4'></div>
      <div>
        {project?.id && <FileTreeViewer projectId={project.id} />}
      </div> */}

      <div className="h-4"></div>
      <div>
        <FileTreeViewer projectId={project?.id} />
      </div>


      <div className='h-4'></div>
      
      <div>
        <CommitLog/>
      </div>

      <div>
        <FloatingTypewriterButton />
      </div>
    </div>
  )
}

export default DashboardPage
 