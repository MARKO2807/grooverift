import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Spirala } from "@/components/motifs/spirala";
import { FeaturePaused } from "@/components/system/states";
import { IconGlobe, IconLock, IconMutual, IconPencil, IconUsers } from "@/components/ui/icons";
import type { Viewer } from "@/lib/authz";
import { musicDnaFor, type MusicDna } from "@/lib/data/music-dna";
import { dropHistory, type ProfileView } from "@/lib/data/profiles";
import { flagState } from "@/lib/flags";
import { Avatar } from "./avatar";
import { PeopleSearchForm } from "./people-search";
import { ProfileMenu, UnblockButton } from "./profile-menu";
import { RelationshipButton } from "./relationship";

type Profile = Extract<ProfileView, { kind: "profile" }>;

// i18n-keys: profile.audience.everyone profile.audience.followers profile.audience.mutuals profile.audience.me
// i18n-keys: profile.visibility.public profile.visibility.private profile.counts.following profile.noArtists

/**
 * PROF-01 / PROF-10 / PUB-08 (J4, D-074): header, bio, the relationship row, the counts (only for lists the
 * viewer may see, U-13), then the sections the policy allowed. Hidden sections are omitted, never shown locked.
 * The owner sees audience labels and Edit; a visitor sees the minimal header (PUB-08); the P state shows the
 * header, the bio and "Request to follow".
 */
export async function ProfileScreen({
  view,
  viewer,
  locale,
  appUrl,
}: {
  view: Profile;
  viewer: Viewer;
  locale: "hr" | "en";
  appUrl: string;
}) {
  const t = await getTranslations("profile");
  const ts = await getTranslations("safety");
  const f = await getFormatter();
  const paused = (await flagState("music_dna")) === "paused";
  const [dna, history] = await Promise.all([
    view.sections.musicDna && !paused ? musicDnaFor(viewer, view.ownerId, locale) : null,
    view.sections.dropHistory ? dropHistory(viewer, view.ownerId, locale, 3) : null,
  ]);
  const mutual = view.relation.follows === "accepted" && view.relation.followedBy;
  const followsYou = view.relation.followedBy && !mutual;
  const profileHref = `/@${view.username}`;
  const ringGenres = dna?.genres.map((g) => ({ name: g.name, traitKey: g.traitKey })) ?? [];

  return (
    <div className="pf">
      {view.self ? <PeopleSearchForm /> : null}
      <div className="pf-main">
        <div className="pm-head">
          <Avatar name={view.displayName} genres={ringGenres} size="lg" />
          <div className="pm-id">
            <h1 className="prof-name pm-name" tabIndex={-1}>
              <span>{view.displayName}</span>
            </h1>
            <p className="meta">
              <span>@{view.username}</span>
              {view.muted ? (
                <>
                  <span aria-hidden="true">·</span>
                  {/* D-075: only the viewer sees it; the muted member never learns of it. */}
                  <span className="rel-chip is-muted">
                    <span aria-hidden="true">{ts("chip.muted")}</span>
                    <span className="sr-only">{ts("chip.mutedSr")}</span>
                  </span>
                </>
              ) : null}
              {mutual ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="rel-chip is-mut">
                    <IconMutual />
                    {t("chip.mutual")}
                  </span>
                </>
              ) : null}
              {followsYou ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="rel-chip">{t("chip.followsYou")}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {view.bio ? <p className="pf-bio">{view.bio}</p> : null}

        {view.self && view.own ? (
          <>
            <p className="pf-vis">
              {view.own.visibility === "public" ? <IconGlobe /> : <IconLock />}
              <span>{t(`visibility.${view.own.visibility}`)}</span>
            </p>
            <div className="rel-row">
              <Link href="/settings/profile" className="btn btn-secondary">
                <IconPencil />
                {t("edit")}
              </Link>
            </div>
          </>
        ) : null}

        {!view.self && !view.minimal ? (
          <div className="rel-row">
            <RelationshipButton
              targetId={view.ownerId}
              username={view.username}
              targetPrivate={view.targetPrivate}
              initial={view.relation.follows}
              followedBy={view.relation.followedBy}
            />
            <ProfileMenu
              targetId={view.ownerId}
              username={view.username}
              displayName={view.displayName}
              shareable={!view.targetPrivate}
              shareUrl={`${appUrl}${locale === "en" ? "/en" : ""}${profileHref}`}
              muted={view.muted}
            />
          </div>
        ) : null}

        {view.minimal ? (
          <p className="hint">
            {t("minimalNote")}{" "}
            <Link href={{ pathname: "/sign-in", query: { returnTo: profileHref } }}>
              {t("minimalSignIn")}
            </Link>
          </p>
        ) : null}

        <CountsRow view={view} />

        {view.privateToViewer ? (
          <div className="empty-b pf-private">
            <IconLock />
            <p className="empty-t">{t("privateTitle")}</p>
            <p>{t("privateText")}</p>
          </div>
        ) : null}
      </div>

      <div className="pf-side">
        {view.sections.musicDna ? (
          <section className="section" aria-labelledby="h-pdna">
            <h2 id="h-pdna" className="section-title">
              {t("dna")}
            </h2>
            {paused ? <FeaturePaused feature="music_dna" /> : <DnaBlock dna={dna} view={view} />}
            {view.self && view.own ? (
              <p className="aud-line">
                <IconUsers />
                <span>
                  {t.rich("visibleTo", {
                    who: t(`audience.${view.own.musicDna}`),
                    b: (c) => <b>{c}</b>,
                  })}
                </span>
                <Link href="/settings/privacy" className="link">
                  {t("change")}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        {view.sections.dropHistory && history ? (
          <section className="section" aria-labelledby="h-phist">
            <h2 id="h-phist" className="section-title">
              {t("history")}
              {history.total ? <span className="count">{history.total}</span> : null}
            </h2>
            {history.items.length ? (
              <ul className="hist">
                {history.items.map((h) => (
                  <li key={h.answerId}>
                    <Link href={`/drop/${h.date}`} className="hrow">
                      <span className="hrow-q">
                        <time dateTime={h.date}>
                          {f.dateTime(new Date(h.date + "T00:00:00Z"), {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </time>
                        <span aria-hidden="true"> · </span>
                        <span className="sr-only">, </span>
                        {h.question}
                      </span>
                      <span className="hrow-t" lang={h.language ?? undefined}>
                        {h.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="set-empty">
                {t("historyEmpty")} {view.self ? t("historyEmptyOwn") : t("historyEmptyOther")}
              </p>
            )}
            {history.total > history.items.length ? (
              <Link href={`${profileHref}/drops`} className="link">
                {t("allAnswers", { n: history.total })}
              </Link>
            ) : null}
            {view.self && view.own ? (
              <p className="aud-line">
                <IconUsers />
                <span>
                  {t.rich("visibleTo", {
                    who: t(`audience.${view.own.dropHistory}`),
                    b: (c) => <b>{c}</b>,
                  })}
                </span>
                <Link href="/settings/privacy" className="link">
                  {t("change")}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Number over label, each opens its list (D-068 (b)); nothing for a list the viewer may not see (U-13). */
async function CountsRow({ view }: { view: Profile }) {
  const t = await getTranslations("profile.counts");
  const c = view.counts;
  const base = `/@${view.username}`;
  const parts: React.ReactNode[] = [];
  if (c.followers !== undefined) {
    parts.push(
      <Link key="fo" href={`${base}/followers`}>
        <b>{c.followers}</b>
        <span>{t("followers", { n: c.followers })}</span>
      </Link>,
      <Link key="fi" href={`${base}/following`}>
        <b>{c.following ?? 0}</b>
        <span>{t("following")}</span>
      </Link>,
    );
  }
  if (c.answers !== undefined) {
    parts.push(
      <Link key="an" href={`${base}/drops`}>
        <b>{c.answers}</b>
        <span>{t("answers", { n: c.answers })}</span>
      </Link>,
    );
  }
  if (!parts.length) return null;
  return <div className="prow-b">{parts}</div>;
}

async function DnaBlock({ dna, view }: { dna: MusicDna | null; view: Profile }) {
  const t = await getTranslations("profile");
  const td = await getTranslations("dna");
  if (!dna || !dna.genres.length) {
    return (
      <div className="pf-dna-empty">
        <p className="set-empty">{view.self ? td("emptyOwn") : t("dnaEmpty")}</p>
        {view.self ? (
          <Link href="/me/dna" className="btn btn-secondary btn-sm">
            <IconPencil />
            {td("edit")}
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <div className="me-dna">
      <Spirala
        genres={dna.genres.map((g) => ({ name: g.name, traitKey: g.traitKey, key: g.slug }))}
        artists={dna.artists.map((a) => ({ name: a.name, genres: [] }))}
        caption={td("summary", { genres: dna.genres.length, artists: dna.artists.length })}
        height={160}
      />
      <p className="pf-genres">
        {dna.genres.map((g, i) => (
          <span key={g.id}>
            {i ? <span aria-hidden="true"> · </span> : null}
            {g.name}
          </span>
        ))}
      </p>
      {dna.artists.length ? (
        <p className="pf-genres pf-artists">
          <span className="sr-only">{t("artists")}: </span>
          {dna.artists.map((a, i) => (
            <span key={a.id}>
              {i ? <span aria-hidden="true"> · </span> : null}
              {a.name}
            </span>
          ))}
        </p>
      ) : null}
      <div className="rel-row pf-dna-links">
        {view.self ? (
          <Link href="/me/dna" className="btn btn-secondary btn-sm me-dna-edit">
            <IconPencil />
            {td("edit")}
          </Link>
        ) : null}
        <Link href={`/@${view.username}/dna`} className="link">
          {t("allDna")}
        </Link>
      </div>
    </div>
  );
}

/** J4 B state: the blocker's own view of a member they blocked, with Unblock (D-019). */
export async function BlockedByYouScreen({
  view,
}: {
  view: Extract<ProfileView, { kind: "blocked-by-you" }>;
}) {
  const t = await getTranslations("profile");
  return (
    <div className="pf">
      <div className="pm-head">
        <Avatar name={view.displayName} size="lg" />
        <div className="pm-id">
          <h1 className="prof-name pm-name" tabIndex={-1}>
            <span>{view.displayName}</span>
          </h1>
          <p className="meta">@{view.username}</p>
        </div>
      </div>
      <div className="empty-b pf-private">
        <IconLock />
        <p className="empty-t">{t("blockedTitle")}</p>
        <p>{t("blockedText")}</p>
        <UnblockButton
          targetId={view.ownerId}
          username={view.username}
          displayName={view.displayName}
        />
      </div>
    </div>
  );
}
