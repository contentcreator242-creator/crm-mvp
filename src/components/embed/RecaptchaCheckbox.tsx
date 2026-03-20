"use client";

import { useEffect, useRef } from "react";
import { needsRecaptchaV2Checkbox, RECAPTCHA_SITE_KEY } from "./recaptchaConfig";

const CALLBACK_NAME = "__lendexRecaptchaOnLoad";

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(() => resolve());
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://www.google.com/recaptcha/api.js"]',
    );
    if (existing) {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (window.grecaptcha?.ready) {
          window.clearInterval(timer);
          window.grecaptcha.ready(() => resolve());
        } else if (Date.now() - start > 25_000) {
          window.clearInterval(timer);
          reject(new Error("reCAPTCHA script timeout"));
        }
      }, 50);
      return;
    }

    (window as unknown as Record<string, () => void>)[CALLBACK_NAME] = () => {
      delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      if (window.grecaptcha?.ready) {
        window.grecaptcha.ready(() => resolve());
      } else {
        reject(new Error("reCAPTCHA failed to initialize"));
      }
    };

    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?onload=${CALLBACK_NAME}&render=explicit`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
}

/**
 * Google reCAPTCHA v2 checkbox.
 * Renders nothing if the site key is unset or `NEXT_PUBLIC_RECAPTCHA_VERSION=v3`.
 */
export function RecaptchaCheckbox({
  onChange,
}: {
  onChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!needsRecaptchaV2Checkbox() || !RECAPTCHA_SITE_KEY || !containerRef.current) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadRecaptchaScript();
        if (cancelled || !containerRef.current || widgetIdRef.current != null) return;

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (t: string) => onChangeRef.current(t),
          "expired-callback": () => onChangeRef.current(null),
          "error-callback": () => onChangeRef.current(null),
        });
      } catch {
        onChangeRef.current(null);
      }
    })();

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!needsRecaptchaV2Checkbox()) return null;

  return (
    <div className="flex min-h-[78px] justify-center">
      <div ref={containerRef} className="inline-block scale-100 origin-top sm:origin-top" />
    </div>
  );
}
