import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NoticeForm } from "@/components/legal/notice-form";
import { DraftMark } from "@/components/shell/draft-mark";
import { PublicShell } from "@/components/shell/public-shell";
import { Notice } from "@/components/ui/notice";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notice");
  return { title: t("title") };
}

/** PUB-11: DSA Art. 16 notice and action, for anyone, with or without an account. */
export default async function NoticePage() {
  const t = await getTranslations("notice");
  const session = await getSession();
  return (
    <PublicShell screen="notice" signedIn={!!session}>
      <div className="doc">
        <h1 tabIndex={-1}>{t("title")}</h1>
        <DraftMark />
        <p className="lead">{t("lead")}</p>
        <Notice kind="warning">{t("urgent")}</Notice>
        <NoticeForm />
      </div>
    </PublicShell>
  );
}
