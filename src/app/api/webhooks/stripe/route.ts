import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.metadata?.userId) {
        await User.findByIdAndUpdate(session.metadata.userId, {
          stripeCustomerId: session.customer as string,
          plan: "pro",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await User.findOne({
        stripeCustomerId: subscription.customer as string,
      });
      if (user) {
        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";
        user.plan = isActive ? "pro" : "free";
        await user.save();
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate(
        { stripeCustomerId: subscription.customer as string },
        { plan: "free" }
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`Payment failed for customer: ${invoice.customer}`);
      // TODO: Send email notification via Resend
      break;
    }
  }

  return NextResponse.json({ received: true });
}
