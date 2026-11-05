import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import { featureFlag } from "@/lib/db/schema";
import { flagState, isEnabled, setFlag } from "@/lib/flags";

afterAll(() => closeDb());

// Only this test's own key is touched: the seeded flags (music_dna, push, …) must survive for the e2e suite.
beforeAll(async () => {
  await db().delete(featureFlag).where(eq(featureFlag.key, "thing"));
});

describe("feature flags", () => {
  it("defaults to off for an unknown key", async () => {
    expect(await flagState("nope")).toBe("off");
    expect(await isEnabled("nope", { role: "member" })).toBe(false);
  });

  it("on, off and paused, with an audience", async () => {
    await setFlag("thing", { state: "on" }, null);
    expect(await isEnabled("thing", { role: "member" })).toBe(true);
    await setFlag("thing", { state: "paused" }, null);
    expect(await flagState("thing")).toBe("paused");
    expect(await isEnabled("thing", { role: "member" })).toBe(false);
    await setFlag("thing", { state: "on", audience: { roles: ["admin"] } }, null);
    expect(await isEnabled("thing", { role: "member" })).toBe(false);
    expect(await isEnabled("thing", { role: "admin" })).toBe(true);
    await setFlag("thing", { state: "on", audience: { userIds: ["u1"] } }, null);
    expect(await isEnabled("thing", { role: "member", userId: "u1" })).toBe(true);
    expect(await isEnabled("thing", { role: "member", userId: "u2" })).toBe(false);
  });
});
