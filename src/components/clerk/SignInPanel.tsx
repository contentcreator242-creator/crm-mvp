"use client";

import { SignIn } from "@clerk/nextjs";

/**
 * Hash routing avoids path/catch-all coupling that can prevent the embedded UI from mounting
 * when using `routing="path"` + `[[...sign-in]]` with the App Router.
 */
export function SignInPanel({ forceRedirectUrl }: { forceRedirectUrl?: string }) {
  return (
    <SignIn
      routing="hash"
      {...(forceRedirectUrl ? { forceRedirectUrl } : {})}
    />
  );
}
