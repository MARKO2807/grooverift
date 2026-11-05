import "server-only";
import { redirect } from "@/i18n/navigation";
import { getSession, roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { invitationByToken, type InviteLookup } from "@/lib/data/invitations";
import { onboardingState, type OnboardingState } from "@/lib/data/onboarding";
import { flagState } from "@/lib/flags";
import { adultConfirmed, inviteTokenFromCookies } from "./cookies";
import {
  isPreAccount,
  PATHS,
  prevStep,
  progress,
  reachable,
  type Step,
  type StepContext,
} from "./steps";

// What a step page needs before it renders (J1 E8 and the step order), in one place so every page behaves the
// same: who may see the step, where Back goes and what "Korak N od M" says.

export type StepPage = {
  locale: "hr" | "en";
  step: Step;
  ctx: StepContext;
  progress: { n: number; total: number };
  back: string | undefined;
  /** Before the account: the invitation behind the cookie. */
  invite: InviteLookup;
  /** After the account: the member's state. */
  userId: string | null;
  state: OnboardingState | null;
};

export async function reminderFlag(): Promise<boolean> {
  return (await flagState("push")) === "on";
}

/**
 * Pre-account steps need a usable invitation cookie and no session (a signed-in member goes to their own step or
 * Home); the age step must be answered before the language and account steps. Post-account steps need a session
 * and may not run ahead of the pointer; a finished member goes Home.
 */
export async function stepPage(rawLocale: string, step: Step): Promise<StepPage> {
  const locale = rawLocale === "en" ? "en" : "hr";
  const reminder = await reminderFlag();
  const session = await getSession();

  if (isPreAccount(step)) {
    if (session) {
      const state = await onboardingState(session.user.id);
      redirect({ href: state.onboarded ? "/home" : PATHS[state.step], locale });
    }
    const invite = await invitationByToken(await inviteTokenFromCookies());
    if (!invite.usable) redirect({ href: "/join", locale });
    if (step !== "age" && !(await adultConfirmed())) redirect({ href: PATHS.age, locale });
    const ctx = { hasPicks: false, reminder };
    const prev = prevStep(step, ctx);
    return {
      locale,
      step,
      ctx,
      progress: progress(step, ctx),
      back: prev ? PATHS[prev] : "/join",
      invite,
      userId: null,
      state: null,
    };
  }

  if (!session) redirect({ href: "/join", locale });
  const viewer = await loadViewer({ id: session!.user.id, role: roleOf(session) });
  if (viewer.status !== "active") redirect({ href: "/home", locale });
  const state = await onboardingState(session!.user.id);
  if (state.onboarded) redirect({ href: "/home", locale });
  const ctx = { hasPicks: state.hasPicks, reminder };
  if (!reachable(step, state.step, ctx)) redirect({ href: PATHS[state.step], locale });
  const prev = prevStep(step, ctx);
  return {
    locale,
    step,
    ctx,
    progress: progress(step, ctx),
    back: prev ? PATHS[prev] : undefined,
    invite: { usable: false },
    userId: session!.user.id,
    state,
  };
}
