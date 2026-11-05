import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { Spirala } from "@/components/motifs/spirala";
import { Avatar } from "@/components/profile/avatar";
import { FeaturePaused } from "@/components/system/states";
import { IconPencil } from "@/components/ui/icons";
import { musicDnaFor } from "@/lib/data/music-dna";
import { profileByUsername } from "@/lib/data/profiles";
import { flagState } from "@/lib/flags";
import { genreColour } from "@/lib/music/genre-traits";
import { notAvailable, profileViewer } from "@/lib/profile/page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; username: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dna");
  return { title: t("title") };
}

/** `/@<username>/dna` (PROF-04): the whole Music DNA, for viewers who may see the section (D-024). */
export default async function ProfileDnaPage({ params }: { params: Params }) {
  const { locale, username } = await params;
  const lang = locale === "en" ? "en" : "hr";
  const { viewer, session } = await profileViewer(locale, `/@${username}/dna`);
  if (!session) notAvailable();
  const view = await profileByUsername(viewer, username);
  if (view.kind !== "profile" || !view.sections.musicDna) notAvailable();
  const td = await getTranslations("dna");
  const t = await getTranslations("profile");
  const paused = (await flagState("music_dna")) === "paused";
  const dna = paused ? null : await musicDnaFor(viewer, view.ownerId, lang);
  if (!paused && !dna) notAvailable();
  return (
    <AppShell
      title={td("title")}
      backHref={`/@${view.username}`}
      nav={view.self ? "profile" : undefined}
      screen="narrow"
    >
      <Link href={`/@${view.username}`} className="fl-person mdrops-head">
        <Avatar name={view.displayName} size="sm" />
        <span className="set-txt">
          <span className="set-t">{view.displayName}</span>
          <span className="set-d">@{view.username}</span>
        </span>
      </Link>
      {paused || !dna ? (
        <FeaturePaused feature="music_dna" />
      ) : (
        <>
          {dna.genres.length ? (
            <Spirala
              genres={dna.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
              artists={dna.artists.map((a) => ({ name: a.name, genres: [] }))}
              caption={td("summary", { genres: dna.genres.length, artists: dna.artists.length })}
              height={180}
            />
          ) : null}
          <section className="set-group" aria-labelledby="h-dg">
            <h2 id="h-dg" className="set-gt">
              {td("genres")}
            </h2>
            {dna.genres.length ? (
              <ol className="dna-rows">
                {dna.genres.map((g, i) => (
                  <li
                    key={g.id}
                    className="dna-row"
                    style={{ "--g": genreColour(g.name, g.traitKey) } as React.CSSProperties}
                  >
                    <span className="dna-swatch" aria-hidden="true" />
                    <span className="dna-pos" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="dna-name">
                      {g.name}
                      {g.parentName ? <span className="dna-fam"> · {g.parentName}</span> : null}
                    </span>
                    <span />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="set-empty">{view.self ? td("emptyOwn") : t("dnaEmpty")}</p>
            )}
          </section>
          <section className="set-group" aria-labelledby="h-da">
            <h2 id="h-da" className="set-gt">
              {td("artists")}
            </h2>
            {dna.artists.length ? (
              <ol className="dna-rows">
                {dna.artists.map((a, i) => (
                  <li key={a.id} className="dna-row">
                    <span className="dna-swatch" aria-hidden="true" />
                    <span className="dna-pos" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="dna-name">
                      {a.name}
                      {a.unavailable ? (
                        <span className="dna-fam"> · {td("unavailable")}</span>
                      ) : null}
                    </span>
                    <span />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="set-empty">{t("noArtists")}</p>
            )}
          </section>
          {view.self ? (
            <Link href="/me/dna" className="btn btn-secondary btn-sm me-dna-edit">
              <IconPencil />
              {td("edit")}
            </Link>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
