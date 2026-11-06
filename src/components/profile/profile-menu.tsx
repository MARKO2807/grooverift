"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { IconBell, IconBlock, IconMore, IconShare, IconWarning } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useSafety } from "@/components/safety/safety-dialogs";

// The ⋯ menu on another member's profile (IA10, D-074, D-075): Share (public profiles only), Mute or Unmute, Block
// and Report, each with its own flow (SAFE-01 to SAFE-03; the "arrive soon" note is gone, D-099 (3)). The blocker's
// own view (J4 B state) offers Unblock with the J5 facts, and Report (J5 E2: reporting stays possible after a block).

// i18n-keys: safety.error.signedOut safety.error.notAllowed safety.error.notAvailable safety.error.tooMany
// i18n-keys: safety.error.generic

export function ProfileMenu({
  targetId,
  username,
  displayName,
  shareable,
  shareUrl,
  muted,
}: {
  targetId: string;
  username: string;
  displayName: string;
  shareable: boolean;
  shareUrl: string;
  muted: boolean;
}) {
  const t = useTranslations("profile");
  const ts = useTranslations("safety");
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const person = { id: targetId, username, displayName };
  const safety = useSafety({ person, report: { type: "profile", id: targetId }, muted });

  const share = async () => {
    setMenu(false);
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl, title: displayName });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.show(t("shareCopied"));
    } catch {
      toast.show(t("shareFailed", { url: shareUrl }));
    }
  };

  const pick = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  const unmute = async () => {
    setMenu(false);
    const r = await safety.unmute();
    toast.show(r.ok ? ts("mute.undone") : ts(`error.${r.reason}`));
  };

  return (
    <>
      <button
        type="button"
        className="iconbtn"
        aria-label={t("more", { name: displayName })}
        aria-haspopup="dialog"
        onClick={() => setMenu(true)}
      >
        <IconMore />
      </button>
      <Dialog title={t("moreTitle", { username })} isOpen={menu} onOpenChange={setMenu}>
        <div className="menu">
          {shareable ? (
            <button type="button" className="menu-item" onClick={share}>
              <IconShare />
              {t("share")}
            </button>
          ) : null}
          {safety.muted ? (
            <button type="button" className="menu-item" onClick={unmute}>
              <IconBell />
              {ts("menu.unmute")}
            </button>
          ) : (
            <button type="button" className="menu-item" onClick={pick(safety.openMute)}>
              <IconBell />
              {ts("menu.mute", { username })}
            </button>
          )}
          <button type="button" className="menu-item" onClick={pick(safety.openBlock)}>
            <IconBlock />
            {ts("menu.block", { username })}
          </button>
          <button type="button" className="menu-item" onClick={pick(safety.openReport)}>
            <IconWarning />
            {ts("menu.reportProfile")}
          </button>
        </div>
      </Dialog>
      {safety.dialogs}
    </>
  );
}

/** The J4 B state: Unblock (with the J5 unblock facts) and Report. */
export function UnblockButton({
  targetId,
  username,
  displayName,
}: {
  targetId: string;
  username: string;
  displayName: string;
}) {
  const ts = useTranslations("safety");
  const safety = useSafety({
    person: { id: targetId, username, displayName },
    report: { type: "profile", id: targetId },
  });
  return (
    <div className="rel-row">
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="dialog"
        onClick={safety.openUnblock}
      >
        {ts("unblock.button")}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="dialog"
        onClick={safety.openReport}
      >
        {ts("menu.reportProfile")}
      </button>
      {safety.dialogs}
    </div>
  );
}
