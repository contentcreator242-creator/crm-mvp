import { describe, it, expect, vi } from "vitest";

let setConfigCalled = false;

const txMock = {
  $executeRaw: vi.fn(async () => {
    setConfigCalled = true;
    return 0;
  }),
} as any;

const prismaMock = {
  $transaction: vi.fn(async (cb: any) => {
    return cb(txMock);
  }),
};

vi.mock("./prisma", () => ({ getPrisma: () => prismaMock }));

describe("withTenantDb", () => {
  it("sets app.current_tenant_id before executing the callback", async () => {
    const { withTenantDb } = await import("./tenantDb");

    setConfigCalled = false;
    txMock.$executeRaw.mockClear();
    prismaMock.$transaction.mockClear();

    const result = await withTenantDb("00000000-0000-0000-0000-000000000000", async () => {
      expect(setConfigCalled).toBe(true);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(txMock.$executeRaw).toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});

