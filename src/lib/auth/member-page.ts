import { redirect } from "@/i18n/navigation";
import { getSession } from "./session";

/** For signed-in pages: the session, or a redirect to sign-in that returns to `path` afterwards. */
export async function memberPage(locale: string, path: string) {
  const session = await getSession();
  if (!session) {
    redirect({ href: { pathname: "/sign-in", query: { returnTo: path } }, locale });
  }
  return session!;
}
