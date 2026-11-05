import { redirect } from "@/i18n/navigation";
import { memberPage } from "@/lib/auth/member-page";
import { ownProfile } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

/**
 * The Profile tab (PROF-10): the own profile lives at `/@<username>` since step 5.5 (D-094 (3)); the tab bar
 * and the rail keep the fixed `/me` target and land here, which sends the member on. `/me/dna` stays the editor.
 */
export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await memberPage(locale, "/me");
  const own = await ownProfile(session.user.id);
  redirect({ href: own ? `/@${own.username}` : "/join/username", locale });
}
