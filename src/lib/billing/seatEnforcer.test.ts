import { describe, it, expect } from "vitest";
import { assertSeatsAvailable } from "./seatEnforcer";
import { ApiError } from "../api/errors";

describe("assertSeatsAvailable", () => {
  it("bypasses seat checks for beta tenants", () => {
    expect(() =>
      assertSeatsAvailable({
        isBeta: true,
        seatQuantity: 0,
        activeMemberCount: 999,
      }),
    ).not.toThrow();
  });

  it("throws 409 when no seats are active", () => {
    expect(() =>
      assertSeatsAvailable({
        isBeta: false,
        seatQuantity: 0,
        activeMemberCount: 0,
      }),
    ).toThrowError(ApiError);
  });

  it("throws 409 when active members exceed seat quantity", () => {
    try {
      assertSeatsAvailable({
        isBeta: false,
        seatQuantity: 3,
        activeMemberCount: 3,
      });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(409);
      expect(err.code).toBe("conflict");
    }
  });

  it("allows when active members are below seat quantity", () => {
    expect(() =>
      assertSeatsAvailable({
        isBeta: false,
        seatQuantity: 3,
        activeMemberCount: 2,
      }),
    ).not.toThrow();
  });
});

