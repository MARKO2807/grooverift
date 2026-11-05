import { redirect } from "@/i18n/navigation";
import { onboardingState } from "@/lib/data/onboarding";
import { PATHS } from "@/lib/onboarding/steps";
import { getSession } from "./session";

/**
 * For signed-in pages: the session, or a redirect to sign-in that returns to `path` afterwards. A member who has
 * not finished onboarding is sent to their next step first (J1 E8: every app route redirects to onboarding).
 */
export async function memberPage(locale: string, path: string) {
  const session = await getSession();
  if (!session) {
    redirect({ href: { pathname: "/sign-in", query: { returnTo: path } }, locale });
  }
  const state = await onboardingState(session!.user.id);
  if (!state.onboarded) redirect({ href: PATHS[state.step], locale });
  return session!;
}
