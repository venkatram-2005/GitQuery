import { api } from "@/trpc/react";

const createOrder = api.billing.createOrder.useMutation();
const verifyPayment = api.billing.verifyPayment.useMutation();

async function createCheckoutSession(credits: number) {
  const order = await createOrder.mutateAsync({ credits });

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    amount: order.amount,
    currency: "INR",
    name: "GitQuery",
    description: `${credits} credits purchase`,
    order_id: order.id,
    handler: async function (response: any) {
      await verifyPayment.mutateAsync({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      alert("✅ Payment successful! Credits added.");
    },
    theme: { color: "#3399cc" },
  };

  // @ts-ignore Razorpay comes from global script
  const rzp = new Razorpay(options);
  rzp.open();
}
