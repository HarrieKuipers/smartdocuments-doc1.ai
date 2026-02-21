import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

export const stripe = {
  get webhooks() {
    return getStripe().webhooks;
  },
  get checkout() {
    return getStripe().checkout;
  },
  get customers() {
    return getStripe().customers;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
};

export const PLANS = {
  free: {
    name: "Free",
    maxDocuments: 1,
    maxTeamMembers: 1,
    features: ["1 document", "AI Chat", "B1 taalniveau"],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 49,
    maxDocuments: 25,
    maxTeamMembers: 5,
    features: [
      "25 documenten",
      "AI Chat",
      "B1, B2, C1 taalniveaus",
      "Alle huisstijlen + custom",
      "Collecties",
      "Volledige analytics",
      "Wachtwoordbeveiliging",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    price: null,
    maxDocuments: Infinity,
    maxTeamMembers: Infinity,
    features: [
      "Onbeperkt documenten",
      "Alles in Pro",
      "Custom domein",
      "Onbeperkt teamleden",
      "Prioriteit support",
      "API toegang",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanLimits(plan: PlanType) {
  return PLANS[plan];
}

export function canCreateDocument(plan: PlanType, currentCount: number): boolean {
  return currentCount < PLANS[plan].maxDocuments;
}
