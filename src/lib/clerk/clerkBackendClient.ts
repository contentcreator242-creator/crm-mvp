import { createClerkClient } from "@clerk/backend";

export function getClerkBackendClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");
  return createClerkClient({ secretKey });
}
