import { ApiError } from "@/lib/api/errors";

/**
 * Lead capture / embed: if `RECAPTCHA_SECRET_KEY` is set, Google reCAPTCHA (v2 or v3) is required.
 * v3 responses include a score; optional `RECAPTCHA_MIN_SCORE` (default 0.5) and `RECAPTCHA_EXPECTED_ACTION` (default lead_submit).
 * Otherwise, if `TURNSTILE_SECRET_KEY` is set, Cloudflare Turnstile is required.
 * If neither is set, verification is skipped (local/dev).
 */
export async function verifyPublicLeadCaptcha(
  tokens: { turnstileToken?: string | null | undefined; recaptchaToken?: string | null | undefined },
  remoteIp: string | null,
) {
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (recaptchaSecret) {
    await verifyRecaptcha(tokens.recaptchaToken, remoteIp);
    return;
  }
  if (turnstileSecret) {
    await verifyTurnstile(tokens.turnstileToken, remoteIp);
    return;
  }
}

/** Verifies Google reCAPTCHA v2/v3 response when `RECAPTCHA_SECRET_KEY` is set. */
export async function verifyRecaptcha(token: string | undefined | null, remoteIp: string | null) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return;
  }

  if (!token) {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "CAPTCHA token required",
    });
  }

  const params = new URLSearchParams({
    secret,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as {
    success?: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };

  if (!data?.success) {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "CAPTCHA verification failed",
      details: data,
    });
  }

  // reCAPTCHA v3 returns score + action; v2 checkbox does not.
  if (typeof data.score === "number") {
    const minRaw = process.env.RECAPTCHA_MIN_SCORE;
    const min = minRaw === undefined || minRaw === "" ? 0.5 : Number(minRaw);
    if (!Number.isFinite(min) || data.score < min) {
      throw new ApiError({
        status: 400,
        code: "bad_request",
        message: "CAPTCHA score too low",
        details: { score: data.score, min },
      });
    }

    const expectedAction = process.env.RECAPTCHA_EXPECTED_ACTION ?? "lead_submit";
    if (
      typeof data.action === "string" &&
      data.action.length > 0 &&
      data.action !== expectedAction
    ) {
      throw new ApiError({
        status: 400,
        code: "bad_request",
        message: "CAPTCHA action mismatch",
        details: { action: data.action, expectedAction },
      });
    }
  }
}

/** Verifies Turnstile when `TURNSTILE_SECRET_KEY` is set; no-op if unset. */
export async function verifyTurnstile(token: string | undefined | null, remoteIp: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return;
  }

  if (!token) {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "CAPTCHA token required",
    });
  }

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const params = new URLSearchParams({
    secret,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as any;

  if (!data?.success) {
    throw new ApiError({
      status: 400,
      code: "bad_request",
      message: "CAPTCHA verification failed",
      details: data,
    });
  }
}

