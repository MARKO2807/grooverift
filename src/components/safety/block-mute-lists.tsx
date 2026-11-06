"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { useToast } from "@/components/ui/toast";
import { unmuteAction } from "@/lib/safety/actions";
import { useSafety, type SafetyPerson } from "./safety-dialogs";

// SAFE-08 (D-075): the real block and mute lists. Unblock asks first and says what changes (J5: follows do not
// come back, the other person can see the member again); unmute needs no question (it only shows more, J5 E11).
// E13: no limit on blocks; the list is plain, newest first.

// i18n-keys: safety.error.signedOut safety.error.notAllowed safety.error.notAvailable safety.error.tooMany
// i18n-keys: safety.error.generic

function BlockedRow({ p }: { p: SafetyPerson }) {
  const t = useTranslations("safety");
  const safety = useSafety({ person: p, report: { type: "profile", id: p.id } });
  return (
    <li className="bl-row">
      <Avatar name={p.displayName} size="sm" />
      <span className="set-txt">
        <span className="set-t">{p.displayName}</span>
        <span className="set-d">@{p.username}</span>
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-haspopup="dialog"
        onClick={safety.openUnblock}
      >
        {t("unblock.button")}
        <span className="sr-only"> @{p.username}</span>
      </button>
      {safety.dialogs}
    </li>
  );
}

function MutedRow({ p }: { p: SafetyPerson }) {
  const t = useTranslations("safety");
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unmute = async () => {
    if (busy) return;
    setBusy(true);
    const r = await unmuteAction(p.id);
    setBusy(false);
    toast.show(r.ok ? t("mute.undone") : t(`error.${r.reason}`));
    if (r.ok) router.refresh();
  };
  return (
    <li className="bl-row">
      <Avatar name={p.displayName} size="sm" />
      <Link href={`/@${p.username}`} className="set-txt">
        <span className="set-t">{p.displayName}</span>
        <span className="set-d">@{p.username}</span>
      </Link>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-disabled={busy || undefined}
        onClick={unmute}
      >
        {t("menu.unmute")}
        <span className="sr-only"> @{p.username}</span>
      </button>
    </li>
  );
}

export function BlockMuteLists({
  blocked,
  muted,
}: {
  blocked: SafetyPerson[];
  muted: SafetyPerson[];
}) {
  const t = useTranslations("safety.lists");
  return (
    <>
      <section className="section" aria-labelledby="h-bl">
        <h2 id="h-bl" className="set-gt">
          {t("blocked")}
        </h2>
        {blocked.length ? (
          <ul className="bl-list">
            {blocked.map((p) => (
              <BlockedRow key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <p className="set-empty">{t("blockedEmpty")}</p>
        )}
        <p className="set-note">{t("blockedNote")}</p>
      </section>
      <section className="section" aria-labelledby="h-mu">
        <h2 id="h-mu" className="set-gt">
          {t("muted")}
        </h2>
        {muted.length ? (
          <ul className="bl-list">
            {muted.map((p) => (
              <MutedRow key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <p className="set-empty">{t("mutedEmpty")}</p>
        )}
        <p className="set-note">{t("mutedNote")}</p>
      </section>
    </>
  );
}
