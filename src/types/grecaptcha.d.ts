/** Minimal typings for Google reCAPTCHA (v2 explicit + v3 execute). */
export {};

declare global {
  interface Window {
    grecaptcha: {
      ready: (fn: () => void) => void;
      /** v3 only (?render=sitekey) */
      execute?: (siteKey: string, opts: { action: string }) => Promise<string>;
      /** v2 explicit mode */
      render: (
        container: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}
