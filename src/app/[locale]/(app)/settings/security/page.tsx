import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import {
  BackupCodes,
  ChangePasswordForm,
  SessionsList,
  TwoFactorSection,
  type SessionRow,
} from "@/components/settings/security-forms";
import { SETUP_DONE_COOKIE, verifySetupMarker } from "@/lib/auth/constants";
import { auth } from "@/lib/auth/auth";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { getSession, roleOf } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.security");
  return { title: t("title") };
}

/** A short device label from the user agent; never the raw string (it is personal data, kept in the DB only). */
function deviceLabel(ua: string | null | undefined, unknown: string): string {
  if (!ua) return unknown;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [browser, os].filter(Boolean).join(" · ") || unknown;
}

export default async function SecurityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ changed?: string; setup?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session)
    redirect({ href: { pathname: "/sign-in", query: { returnTo: "/settings/security" } }, locale });
  const t = await getTranslations("settings.security");
  const f = await getFormatter();
  const list = await auth.api.listSessions({ headers: await headers() });

  // Recovery codes right after setup: only with the signed one-time marker the verify action set for
  // THIS session (constants.ts), and only for the signed-in member's own row (server-only endpoint).
  let setupCodes: string[] | null = null;
  const marker = (await cookies()).get(SETUP_DONE_COOKIE)?.value;
  if (
    sp.setup === "done" &&
    session!.user.twoFactorEnabled &&
    verifySetupMarker(marker, session!.session.token)
  ) {
    try {
      const res = await auth.api.viewBackupCodes({ body: { userId: session!.user.id } });
      setupCodes = res.backupCodes;
    } catch {
      setupCodes = null;
    }
  }
  // The page only ever sees session ids, never the bearer tokens (security review M2).
  const sessions: SessionRow[] = list
    .map((s) => ({
      id: s.id,
      current: s.id === session!.session.id,
      device: deviceLabel(s.userAgent, t("unknownDevice")),
      lastSeen: f.dateTime(s.updatedAt, { dateStyle: "medium", timeStyle: "short" }),
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
  const role = roleOf(session);

  return (
    <AppShell title={t("title")} backHref="/home">
      <section className="form-stack" aria-labelledby="h-pw">
        <h2 id="h-pw" className="set-t">
          {t("password")}
        </h2>
        <ChangePasswordForm changed={sp.changed === "1"} />
      </section>
      <section className="form-stack" aria-labelledby="h-2fa">
        <h2 id="h-2fa" className="set-t">
          {t("twoFactor")}
        </h2>
        {setupCodes ? (
          <BackupCodes codes={setupCodes} />
        ) : (
          <TwoFactorSection
            enabled={Boolean(session!.user.twoFactorEnabled)}
            isStaff={STAFF_ROLES.includes(role)}
          />
        )}
      </section>
      <section className="form-stack" aria-labelledby="h-sess">
        <h2 id="h-sess" className="set-t" tabIndex={-1}>
          {t("sessions")}
        </h2>
        <SessionsList sessions={sessions} />
      </section>
    </AppShell>
  );
}
