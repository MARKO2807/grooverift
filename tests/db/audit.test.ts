import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { audit, hashIp, redact } from "@/lib/audit";

afterAll(() => closeDb());

describe("audit log", () => {
  it("redacts credential-like keys and never stores a raw IP", async () => {
    const meta = redact({ password: "x", token: "y", note: "ok", nested: { otp: "1" } });
    expect(meta).toEqual({
      password: "[redacted]",
      token: "[redacted]",
      note: "ok",
      nested: { otp: "[redacted]" },
    });
    expect(hashIp("203.0.113.9")).not.toContain("203");
    expect(hashIp("203.0.113.9")).toBe(hashIp("203.0.113.9"));
    expect(hashIp(null)).toBeNull();
  });

  it("appends an entry", async () => {
    const action = `test.audit.${Date.now()}`;
    await audit({ actorType: "system", action, ip: "203.0.113.9", metadata: { secret: "no" } });
    const [row] = await db().select().from(auditLog).where(eq(auditLog.action, action));
    expect(row).toBeDefined();
    expect(row!.metadata).toEqual({ secret: "[redacted]" });
    expect(row!.ipHash).toHaveLength(32);
  });

  it("is append-only: UPDATE and DELETE are rejected by the database", async () => {
    const action = `test.audit.immutable.${Date.now()}`;
    await audit({ actorType: "system", action });
    const [row] = await db().select().from(auditLog).where(eq(auditLog.action, action));
    // Drizzle wraps the database error; the trigger's message is on the cause.
    const rejectedAsAppendOnly = (e: unknown) =>
      /append-only/.test(String((e as { cause?: Error }).cause?.message ?? (e as Error).message));
    await expect(
      db().update(auditLog).set({ action: "tampered" }).where(eq(auditLog.id, row!.id)),
    ).rejects.toSatisfy(rejectedAsAppendOnly);
    await expect(db().delete(auditLog).where(eq(auditLog.id, row!.id))).rejects.toSatisfy(
      rejectedAsAppendOnly,
    );
    await expect(db().execute(sql`truncate audit_log`)).rejects.toSatisfy(rejectedAsAppendOnly);
  });
});
