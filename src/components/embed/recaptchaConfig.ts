/** Public site key from Google reCAPTCHA admin (v2 checkbox or v3 score). */
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

/**
 * `v2` — “I’m not a robot” checkbox (default).
 * `v3` — invisible score-based token at submit time.
 */
export const RECAPTCHA_VERSION =
  process.env.NEXT_PUBLIC_RECAPTCHA_VERSION === "v3" ? ("v3" as const) : ("v2" as const);

export function isRecaptchaSiteKeyConfigured(): boolean {
  return RECAPTCHA_SITE_KEY.length > 0;
}

export function isRecaptchaV3(): boolean {
  return isRecaptchaSiteKeyConfigured() && RECAPTCHA_VERSION === "v3";
}

export function needsRecaptchaV2Checkbox(): boolean {
  return isRecaptchaSiteKeyConfigured() && RECAPTCHA_VERSION === "v2";
}
