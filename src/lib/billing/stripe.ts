import Stripe from "stripe";
import { readServerEnvTrimmed } from "@/lib/billing/readServerEnv";

let cached: Stripe | null = null;

export function getStripe() {
  if (cached) return cached;

  const secretKey = readServerEnvTrimmed("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  cached = new Stripe(secretKey);
  return cached;
}

