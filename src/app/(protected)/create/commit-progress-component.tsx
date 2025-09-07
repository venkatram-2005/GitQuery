'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose?: () => void
}

export default function CommitProgressDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className='sm:max-w-md z-50'>
        <DialogHeader>
          <DialogTitle>Summarizing Commits</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col items-center gap-4 py-6'>
          <div className='animate-spin h-8 w-8 border-4 border-gray-300 border-t-transparent rounded-full'></div>
          <p className='text-sm text-gray-600'>Summarizing commits...</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
