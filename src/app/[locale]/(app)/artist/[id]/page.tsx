import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { ArtistPhoto } from "@/components/dna/artist-photo";
import { IconInfo } from "@/components/ui/icons";
import { memberPage } from "@/lib/auth/member-page";
import { roleOf } from "@/lib/auth/session";
import { artistPhotoAdmin, photoOfArtist } from "@/lib/data/artist-photos";
import { answersMentioning } from "@/lib/data/answers";
import { artistPage } from "@/lib/data/catalog";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { loadViewer } from "@/lib/data/facts";

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
 * Step 5.11: the round photo from Commons with "O fotografiji" (D-118 (1), (2)); admins can hide it (D-118 (5)).
 */
export default async function ArtistPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  const session = await memberPage(locale, `/artist/${id}`);
  const a = await artistPage(id);
  if (!a) notFound();
  if (a.redirectedFrom) redirect({ href: `/artist/${a.id}`, locale });
  // The admin role counts only with a second factor (loadViewer, review M3).
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  const [photo, admin, mentions] = await Promise.all([
    photoOfArtist(a.id),
    viewer.role === "admin" ? artistPhotoAdmin(a.id) : Promise.resolve(null),
    answersMentioning(viewer, a.id),
  ]);
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
        <ArtistPhoto artistId={a.id} name={a.name} photo={photo} admin={admin} />
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
      {mentions.length ? (
        <section className="set-group" aria-labelledby="h-mentions">
          <h2 id="h-mentions" className="set-gt">
            {t("mentions")}
          </h2>
          <ul className="set-list">
            {mentions.map((m) => (
              <li key={m.answer.id}>
                <Link href={`/drop/${m.date}/a/${m.answer.id}`} className="set-link mention">
                  <Avatar
                    name={m.answer.author.displayName}
                    size="sm"
                    photo={m.answer.author.photoId}
                  />
                  <span className="set-txt">
                    <span className="set-t">{m.answer.author.displayName}</span>
                    <span className="set-d mention-text">
                      {m.answer.body.length > 120
                        ? `${m.answer.body.slice(0, 119).trimEnd()}…`
                        : m.answer.body}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
