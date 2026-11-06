import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ArtistTile } from "@/components/dna/artist-tile";
import { IconInfo } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { artistPage } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const a = await artistPage(id);
  const t = await getTranslations("artist");
  return { title: a?.name ?? t("title") };
}

/**
 * CAT-01 α (IA §5): an artist's name, the MusicBrainz description, country and years, the "no longer available"
 * state (J2 E5) and the link to the source. Members only, like everything that is not the Daily Drop question
 * (D-022). A merged id redirects to the canonical artist (invariant 5). Catalogue facts only, nothing about members.
 */
export default async function ArtistPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  await memberPage(locale, `/artist/${id}`);
  const a = await artistPage(id);
  if (!a) notFound();
  if (a.redirectedFrom) redirect({ href: `/artist/${a.id}`, locale });
  const t = await getTranslations("artist");
  let country: string | null = null;
  if (a.country) {
    try {
      country = new Intl.DisplayNames([locale], { type: "region" }).of(a.country) ?? a.country;
    } catch {
      country = a.country;
    }
  }
  const years = a.beginYear ? (a.endYear ? `${a.beginYear}–${a.endYear}` : `${a.beginYear}`) : null;
  const facts = [country, years].filter(Boolean).join(", ");
  return (
    <AppShell title={a.name} backHref="/home" backHistory screen="narrow">
      <div className="cat-head">
        <ArtistTile name={a.name} size="lg" />
        <div className="cat-head-txt">
          {a.disambiguation ? <p className="cat-dis">{a.disambiguation}</p> : null}
          {facts ? <p className="cat-facts">{facts}</p> : null}
        </div>
      </div>
      {a.availability === "unavailable" ? (
        <p className="notice">
          <IconInfo />
          <span>{t("unavailable")}</span>
        </p>
      ) : null}
      {a.mbid ? (
        <section className="set-group" aria-labelledby="h-links">
          <h2 id="h-links" className="set-gt">
            {t("links")}
          </h2>
          <p>
            <a
              className="link"
              href={`https://musicbrainz.org/artist/${a.mbid}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("musicbrainz")}
              <span className="sr-only"> {t("newTab")}</span>
            </a>
          </p>
        </section>
      ) : null}
      <p className="meta">{t("source")}</p>
    </AppShell>
  );
}
