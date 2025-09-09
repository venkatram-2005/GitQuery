'use client'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { api } from '@/trpc/react'
import { Info, Loader } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

// Load Razorpay checkout script
function loadRazorpayScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const BillingPage = () => {
  const { data: credits, refetch } = api.project.getMyCredits.useQuery()
  const createOrder = api.billing.createOrder.useMutation()
  const verifyPayment = api.billing.verifyPayment.useMutation()

  const [creditsToBuy, setCreditsToBuy] = React.useState<number[]>([100])
  const creditsToBuyAmount = creditsToBuy[0]!
  const price = (creditsToBuyAmount * 0.25).toFixed(2);

  async function handleBuyCredits() {
    // 1️⃣ Load Razorpay script
    const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js')
    if (!res) {
      toast.error('Razorpay SDK failed to load. Please check your internet connection.')
      return
    }

    try {
      // 2️⃣ Create order via tRPC
      const order = await createOrder.mutateAsync({ credits: creditsToBuyAmount })

      // 3️⃣ Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: 'GitQuery Credits',
        description: `${creditsToBuyAmount} credits purchase`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const result = await verifyPayment.mutateAsync(response)
            if (result.status === 'success') {
              toast.success('Payment successful')
              refetch() // refresh user credits
            } else {
              toast.error('Payment verification failed ❌')
            }
          } catch (err) {
            toast.error('Something went wrong verifying payment ❌')
          }
        },
        prefill: {
          name: 'Test User',
          email: 'user@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3399cc',
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error('Failed to create order ❌')
    }
  }

  return (
    <div>
      <h1 className='text-xl font-semibold'>Billing</h1>
      <div className="h-2"></div>
      <p className='text-sm text-gray-500'>
        You currently have {credits?.credits ?? 0} credits.
      </p>
      <div className="h-2"></div>
      <div className='bg-blue-50 px-4 py-2 rounded-md border border-blue-200 text-blue-700'>
        <div className="flex items-center gap-2">
          <Info className='size-4' />
          <p className='text-sm'>Each credit allows you to index 1 file in a repository.</p>
        </div>
        <p className='text-sm'>E.g. If your project has 100 files, you will need 100 credits to index it.</p>
      </div>
      <div className="h-4"></div>
      <Slider
        defaultValue={[100]}
        max={1000}
        min={10}
        step={10}
        onValueChange={(value) => setCreditsToBuy(value)}
        value={creditsToBuy}
      />
      <div className="h-4"></div>
      <Button
        onClick={handleBuyCredits}
        disabled={createOrder.isPending}   // ✅ use isPending
        className="flex items-center gap-2"
      >
          {createOrder.isPending && (
            <Loader className="h-4 w-4 animate-spin" />
          )}
          {createOrder.isPending
            ? 'Processing...'
            : `Buy ${creditsToBuyAmount} credits for ₹${price}`}
      </Button>
    </div>
  )
}

export default BillingPage
