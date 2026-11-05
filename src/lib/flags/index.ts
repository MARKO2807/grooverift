import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db/client";
import { featureFlag } from "@/lib/db/schema";

// Feature flags (plan step 4.9). "paused" is the SYS-04 state: the feature is off for everyone
// and the screens show the "na pauzi" message instead of an error.
export type FlagState = "on" | "off" | "paused";
export type FlagAudience = { roles?: string[]; userIds?: string[] };
export type FlagViewer = { role: string; userId?: string };

export async function getFlag(key: string) {
  const [row] = await db().select().from(featureFlag).where(eq(featureFlag.key, key));
  return row ?? null;
}

export async function flagState(key: string): Promise<FlagState> {
  return (await getFlag(key))?.state ?? "off";
}

export async function isEnabled(key: string, viewer: FlagViewer): Promise<boolean> {
  const flag = await getFlag(key);
  if (!flag || flag.state !== "on") return false;
  const { roles, userIds } = flag.audience;
  if (!roles?.length && !userIds?.length) return true;
  if (roles?.includes(viewer.role)) return true;
  if (viewer.userId && userIds?.includes(viewer.userId)) return true;
  return false;
}

export async function listFlags() {
  return db().select().from(featureFlag).orderBy(featureFlag.key);
}

/** Staff-only write; the caller has checked the role. Every change is audited. */
export async function setFlag(
  key: string,
  patch: { state: FlagState; audience?: FlagAudience; note?: string | null },
  actorId: string | null,
) {
  const values = {
    key,
    state: patch.state,
    audience: patch.audience ?? {},
    note: patch.note ?? null,
    updatedBy: actorId,
    updatedAt: new Date(),
  };
  await db()
    .insert(featureFlag)
    .values(values)
    .onConflictDoUpdate({ target: featureFlag.key, set: values });
  await audit({
    actorType: actorId ? "staff" : "system",
    actorId,
    action: "flags.set",
    targetType: "feature_flag",
    targetId: key,
    metadata: { state: patch.state, audience: patch.audience ?? {} },
  });
}
