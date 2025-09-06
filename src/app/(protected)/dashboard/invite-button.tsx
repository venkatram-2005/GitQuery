'use client'

import { Input } from '@/components/ui/input'
import useProject from '@/hooks/use-project'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const InviteButton = () => {
  const { projectId } = useProject()
  const [open, setOpen] = React.useState(false)
  const [inviteLink, setInviteLink] = React.useState("")

  // Only access window after mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteLink(`${window.location.origin}/join/${projectId}`)
    }
  }, [projectId])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>
            Invite the Team Members
          </DialogTitle>
          <DialogHeader>
            <p className="text-sm text-gray-500">
              Ask the team members to copy and paste the link.
            </p>
            <Input
              className="mt-4 cursor-pointer"
              readOnly
              value={inviteLink}
              onClick={() => {
                if (inviteLink) {
                  navigator.clipboard.writeText(inviteLink)
                  toast.success('Link copied to clipboard')
                }
              }}
            />
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Button onClick={() => setOpen(true)} size="sm" className='hover:cursor-pointer'>
        Invite Members
      </Button>
    </>
  )
}

export default InviteButton
