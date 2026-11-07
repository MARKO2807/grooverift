import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NoticeForm } from "@/components/legal/notice-form";
import { DraftMark } from "@/components/shell/draft-mark";
import { PublicShell } from "@/components/shell/public-shell";
import { Notice } from "@/components/ui/notice";
import { getSession } from "@/lib/auth/session";
import { artistPage } from "@/lib/data/catalog";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notice");
  return { title: t("title") };
}

/**
 * PUB-11: DSA Art. 16 notice and action, for anyone, with or without an account. `?photo=<artist id>` comes from
 * "Prijavi problem" in an artist photo's "O fotografiji" sheet (D-118 (5)): the artist is filled in and the form asks
 * what is wrong with the photo.
 */
export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string }>;
}) {
  const t = await getTranslations("notice");
  const session = await getSession();
  const photoId = (await searchParams).photo;
  const artist = typeof photoId === "string" ? await artistPage(photoId) : null;
  const photo = artist
    ? { artistId: artist.id, name: artist.name, url: `${env().APP_URL}/artist/${artist.id}` }
    : undefined;
  return (
    <PublicShell screen="notice" signedIn={!!session}>
      <div className="doc">
        <h1 tabIndex={-1}>{t("title")}</h1>
        <DraftMark />
        <p className="lead">{t("lead")}</p>
        <Notice kind="warning">{t("urgent")}</Notice>
        <NoticeForm photo={photo} />
      </div>
    </PublicShell>
  );
}
