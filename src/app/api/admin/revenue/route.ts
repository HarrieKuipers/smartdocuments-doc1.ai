import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await connectDB();

  // Get plan counts from DB
  const planCounts = await User.aggregate([
    { $group: { _id: "$plan", count: { $sum: 1 } } },
  ]);
  const plans: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
  planCounts.forEach((p: { _id: string; count: number }) => {
    plans[p._id] = p.count;
  });

  const mrr = plans.pro * 49 + plans.enterprise * 199;

  // Try to get recent charges from Stripe
  let recentCharges: { id: string; amount: number; currency: string; status: string; created: number; email: string | null }[] = [];
  try {
    const charges = await getStripe().charges.list({ limit: 20 });
    recentCharges = charges.data.map((c) => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      status: c.status,
      created: c.created,
      email: c.billing_details?.email || null,
    }));
  } catch {
    // Stripe not configured or no charges yet
  }

  // Try to get recently cancelled subscriptions
  let cancelledSubs: { id: string; canceledAt: number; email: string | null }[] = [];
  try {
    const subs = await getStripe().subscriptions.list({
      status: "canceled",
      limit: 10,
    });
    cancelledSubs = subs.data.map((s) => ({
      id: s.id,
      canceledAt: s.canceled_at || 0,
      email: null,
    }));
  } catch {
    // Stripe not configured
  }

  return NextResponse.json({
    mrr,
    plans,
    revenueBreakdown: {
      pro: { count: plans.pro, revenue: plans.pro * 49 },
      enterprise: { count: plans.enterprise, revenue: plans.enterprise * 199 },
    },
    recentCharges,
    cancelledSubs,
  });
}
