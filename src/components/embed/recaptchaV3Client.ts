"use client";

import { RECAPTCHA_SITE_KEY } from "./recaptchaConfig";

/** Load v3 script (?render=SITE_KEY). Safe to call multiple times. */
export function ensureRecaptchaV3Ready(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const done = () => {
      window.grecaptcha.ready(() => resolve());
    };

    if (window.grecaptcha?.execute) {
      done();
      return;
    }

    const sel = `script[data-recaptcha-v3="${siteKey}"]`;
    let el = document.querySelector<HTMLScriptElement>(sel);

    if (!el) {
      el = document.createElement("script");
      el.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      el.async = true;
      el.defer = true;
      el.setAttribute("data-recaptcha-v3", siteKey);
      el.onload = () => done();
      el.onerror = () => reject(new Error("reCAPTCHA v3 load failed"));
      document.head.appendChild(el);
      return;
    }

    const start = Date.now();
    const interval = window.setInterval(() => {
      if (window.grecaptcha?.execute) {
        window.clearInterval(interval);
        done();
      } else if (Date.now() - start > 25_000) {
        window.clearInterval(interval);
        reject(new Error("reCAPTCHA v3 timeout"));
      }
    }, 50);
  });
}

export async function executeRecaptchaV3(
  action: string,
  siteKey: string = RECAPTCHA_SITE_KEY,
): Promise<string> {
  await ensureRecaptchaV3Ready(siteKey);
  const exec = window.grecaptcha.execute;
  if (!exec) throw new Error("reCAPTCHA execute not available");
  return exec.call(window.grecaptcha, siteKey, { action });
}
