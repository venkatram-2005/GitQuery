import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import Razorpay from "razorpay";
import crypto from "crypto";
import { z } from "zod";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const billingRouter = createTRPCRouter({
  // 1️⃣ Create Razorpay Order
  createOrder: protectedProcedure
    .input(z.object({ credits: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId;

      const amount = input.credits * 25; // credits → INR → paise

      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId,
          credits: input.credits.toString(),
        },
      });

      await ctx.db.transaction.create({
        data: {
          //@ts-ignore
          userId,
          credits: input.credits,
          amount,
          status: "created",
          orderId: order.id,
        },
      });

      return order;
    }),

  // 2️⃣ Verify Razorpay Payment
  verifyPayment: protectedProcedure
    .input(
      z.object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId;

      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
      hmac.update(input.razorpay_order_id + "|" + input.razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature !== input.razorpay_signature) {
        throw new Error("Payment verification failed");
      }

      const transaction = await ctx.db.transaction.update({
        where: { orderId: input.razorpay_order_id },
        data: {
          paymentId: input.razorpay_payment_id,
          signature: input.razorpay_signature,
          status: "success",
        },
      });

      await ctx.db.user.update({
        where: { id: userId! },
        data: { credits: { increment: transaction.credits } },
      });

      return { status: "success" };
    }),
});
