"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { FormState } from "@/lib/auth/actions";
import { getSession, roleOf } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import {
  acceptFollowRequest,
  blockMember,
  declineFollowRequest,
  followMember,
  removeFollower,
  unblockMember,
  unfollowMember,
} from "@/lib/data/graph";
import {
  AUDIENCES,
  changeUsername,
  cleanBio,
  PRIVACY_SECTIONS,
  setDiscoverable,
  setProfileVisibility,
  setSectionAudience,
  updateProfile,
  validDisplayName,
  type Audience,
  type PrivacySection,
} from "@/lib/data/profiles";
import { consume, type LimitScope } from "@/lib/data/rate-limit";
import { isReservedUsername } from "@/lib/onboarding/username";
import type { Viewer } from "@/lib/authz";

// Server actions for profiles, the social graph and the privacy settings (PROF-01, PROF-07, PROF-08, ACT-02,
// SET-05; step 5.5). Every action takes the member's own id from the session, never from the client; the target
// id is checked for shape here and again in the data layer, which asks the policy. Failures come back as a reason
// key for the component's messages, never as an exception text. Blocked or hidden targets answer exactly like
// missing ones (IA8).

// i18n-keys: authErrors.bioInvalid authErrors.usernameTooSoon authErrors.usernameSame

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RelationState = "none" | "pending" | "accepted";
export type ActionFailure =
  "signedOut" | "notAllowed" | "notAvailable" | "tooMany" | "wait" | "generic";
export type RelationResult =
  { ok: true; state: RelationState } | { ok: false; reason: ActionFailure; state?: RelationState };
export type SimpleResult = { ok: true } | { ok: false; reason: ActionFailure };

/** The signed-in, active, onboarded member, or the reason the action may not run. */
async function member(
  scope: LimitScope | null,
): Promise<{ viewer: Viewer & { id: string } } | { fail: ActionFailure }> {
  const session = await getSession();
  if (!session) return { fail: "signedOut" };
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (!viewer.id || viewer.status !== "active" || viewer.onboarded === false)
    return { fail: "notAllowed" };
  if (scope && !(await consume(scope, viewer.id)).allowed) return { fail: "tooMany" };
  return { viewer: viewer as Viewer & { id: string } };
}

async function simple(
  where: string,
  scope: LimitScope | null,
  targetId: string,
  body: (viewerId: string) => Promise<SimpleResult | void>,
): Promise<SimpleResult> {
  if (!UUID.test(targetId)) return { ok: false, reason: "notAvailable" };
  try {
    const m = await member(scope);
    if ("fail" in m) return { ok: false, reason: m.fail };
    if (m.viewer.id === targetId) return { ok: false, reason: "notAllowed" };
    return (await body(m.viewer.id)) ?? { ok: true };
  } catch (e) {
    logDbError(where, e);
    return { ok: false, reason: "generic" };
  }
}

// ---------------------------------------------------------------- the relationship button (PROF-01)

export async function followAction(targetId: string): Promise<RelationResult> {
  if (!UUID.test(targetId)) return { ok: false, reason: "notAvailable" };
  try {
    const m = await member(null); // followMember consumes the "follow" limit itself
    if ("fail" in m) return { ok: false, reason: m.fail };
    const r = await followMember(m.viewer, targetId);
    if (r.ok) return { ok: true, state: r.state ?? "accepted" };
    const reason: ActionFailure =
      r.reason === "not-available"
        ? "notAvailable"
        : r.reason === "too-many"
          ? "tooMany"
          : r.reason === "wait"
            ? "wait"
            : "notAllowed";
    return { ok: false, reason, state: "none" };
  } catch (e) {
    logDbError("followAction", e);
    return { ok: false, reason: "generic" };
  }
}

/** Unfollow, or withdraw a pending request: silent for the other side (J4). */
export async function unfollowAction(targetId: string): Promise<RelationResult> {
  const r = await simple("unfollowAction", "graph", targetId, async (viewerId) => {
    await unfollowMember(viewerId, targetId);
  });
  return r.ok ? { ok: true, state: "none" } : r;
}

// ---------------------------------------------------------------- block and unblock (J4 B state; the full flow is 5.9)

export async function blockAction(targetId: string): Promise<SimpleResult> {
  return simple("blockAction", "graph", targetId, async (viewerId) => {
    const r = await blockMember(viewerId, targetId);
    return r.ok ? { ok: true } : { ok: false, reason: "notAllowed" };
  });
}

export async function unblockAction(targetId: string): Promise<SimpleResult> {
  return simple("unblockAction", "graph", targetId, async (viewerId) => {
    await unblockMember(viewerId, targetId);
  });
}

// ---------------------------------------------------------------- follow requests (ACT-02) and followers (D-069)

export async function acceptRequestAction(requesterId: string): Promise<SimpleResult> {
  return simple("acceptRequestAction", "graph", requesterId, async (ownerId) => {
    await acceptFollowRequest(ownerId, requesterId);
  });
}

export async function declineRequestAction(requesterId: string): Promise<SimpleResult> {
  return simple("declineRequestAction", "graph", requesterId, async (ownerId) => {
    await declineFollowRequest(ownerId, requesterId);
  });
}

export async function removeFollowerAction(followerId: string): Promise<SimpleResult> {
  return simple("removeFollowerAction", "graph", followerId, async (ownerId) => {
    await removeFollower(ownerId, followerId);
  });
}

// ---------------------------------------------------------------- edit profile (PROF-08)

const profileSchema = z.object({
  displayName: z.string().max(200),
  bio: z.string().max(5000),
});

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    displayName: String(form.get("displayName") ?? ""),
    bio: String(form.get("bio") ?? ""),
  };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { error: "generic", values };
  try {
    const m = await member("profileEdit");
    if ("fail" in m) return { error: m.fail === "tooMany" ? "tooMany" : "generic", values };
    const r = await updateProfile(m.viewer.id, parsed.data);
    if (!r.ok) {
      // Say which field: the data layer refuses the pair, so the checks are repeated here for the message.
      const fieldErrors: Record<string, string> = {};
      if (!validDisplayName(parsed.data.displayName))
        fieldErrors.displayName = "displayNameInvalid";
      if (cleanBio(parsed.data.bio) === null) fieldErrors.bio = "bioInvalid";
      return { fieldErrors, values };
    }
    return { ok: true, values: { ...values, bio: cleanBio(values.bio) ?? "" } };
  } catch (e) {
    logDbError("updateProfileAction", e);
    return { error: "generic", values };
  }
}

export async function changeUsernameAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = { username: String(form.get("username") ?? "").trim() };
  try {
    const m = await member("profileEdit");
    if ("fail" in m) return { error: m.fail === "tooMany" ? "tooMany" : "generic", values };
    const r = await changeUsername(m.viewer.id, values.username, isReservedUsername);
    if (!r.ok) {
      const key =
        r.reason === "taken"
          ? "usernameTaken"
          : r.reason === "too-soon"
            ? "usernameTooSoon"
            : r.reason === "same"
              ? "usernameSame"
              : r.reason === "not-found"
                ? "generic"
                : "usernameInvalid";
      return key === "generic"
        ? { error: key, values }
        : { fieldErrors: { username: key }, values };
    }
  } catch (e) {
    logDbError("changeUsernameAction", e);
    return { error: "generic", values };
  }
  // The new handle is live at once (J4 E10); the page reloads with it.
  redirect({ href: { pathname: "/settings/profile", query: { renamed: "1" } }, locale });
  return { ok: true };
}

// ---------------------------------------------------------------- privacy (SET-05)

export type VisibilityResult =
  { ok: true; accepted: number } | { ok: false; reason: ActionFailure };

export async function setVisibilityAction(
  visibility: "public" | "private",
  acceptPending: boolean,
): Promise<VisibilityResult> {
  if (visibility !== "public" && visibility !== "private") return { ok: false, reason: "generic" };
  try {
    const m = await member("profileEdit");
    if ("fail" in m) return { ok: false, reason: m.fail };
    const r = await setProfileVisibility(m.viewer.id, visibility, { acceptPending });
    return r.ok ? { ok: true, accepted: r.accepted } : { ok: false, reason: "generic" };
  } catch (e) {
    logDbError("setVisibilityAction", e);
    return { ok: false, reason: "generic" };
  }
}

export async function setAudienceAction(
  section: PrivacySection,
  audience: Audience,
): Promise<SimpleResult> {
  if (!PRIVACY_SECTIONS.includes(section) || !AUDIENCES.includes(audience))
    return { ok: false, reason: "generic" };
  try {
    const m = await member("profileEdit");
    if ("fail" in m) return { ok: false, reason: m.fail };
    await setSectionAudience(m.viewer.id, section, audience);
    return { ok: true };
  } catch (e) {
    logDbError("setAudienceAction", e);
    return { ok: false, reason: "generic" };
  }
}

export async function setDiscoverableAction(discoverable: boolean): Promise<SimpleResult> {
  try {
    const m = await member("profileEdit");
    if ("fail" in m) return { ok: false, reason: m.fail };
    await setDiscoverable(m.viewer.id, discoverable === true);
    return { ok: true };
  } catch (e) {
    logDbError("setDiscoverableAction", e);
    return { ok: false, reason: "generic" };
  }
}
