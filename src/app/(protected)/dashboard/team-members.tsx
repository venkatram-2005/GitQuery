'use client'

import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react'
import React from 'react'

const TeamMembers = () => {
  const {projectId} = useProject()
  const {data: members} = api.project.getTeamMembers.useQuery({projectId})
  return (
    <div className='flex items-center gap-2'>
      {members?.map((member) => (
        <div key={member.id}>
          <img key={member.id} src={member.user.imageUrl || "/avatar.png"} alt={member.user.firstName || "Team Member"} height={30} width={30} className='rounded-full' />
        </div>
      ))}
    </div>
  )
}

export default TeamMembers
