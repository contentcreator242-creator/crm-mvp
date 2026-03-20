import { describe, it, expect } from "vitest";
import { PublicLeadCaptureInput } from "./leadCapture";

describe("PublicLeadCaptureInput", () => {
  it("requires organization key, first name, and email", () => {
    expect(() =>
      PublicLeadCaptureInput.parse({
        organizationPublicKey: "not-a-uuid",
        firstName: "A",
        email: "a@b.co",
      }),
    ).toThrow();

    expect(() =>
      PublicLeadCaptureInput.parse({
        organizationPublicKey: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "Ada",
        email: "ada@example.com",
      }),
    ).not.toThrow();
  });

  it("allows optional turnstile token", () => {
    expect(() =>
      PublicLeadCaptureInput.parse({
        organizationPublicKey: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "Ada",
        email: "ada@example.com",
        turnstileToken: "",
      }),
    ).not.toThrow();
  });

  it("allows optional recaptcha token", () => {
    expect(() =>
      PublicLeadCaptureInput.parse({
        organizationPublicKey: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "Ada",
        email: "ada@example.com",
        recaptchaToken: "",
      }),
    ).not.toThrow();
  });
});
