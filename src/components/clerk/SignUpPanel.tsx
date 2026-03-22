"use client";

import { SignUp } from "@clerk/nextjs";

export function SignUpPanel({ forceRedirectUrl }: { forceRedirectUrl?: string }) {
  return (
    <SignUp
      routing="hash"
      {...(forceRedirectUrl ? { forceRedirectUrl } : {})}
    />
  );
}
