"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { IconBlock, IconMore, IconShare } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { blockAction, unblockAction } from "@/lib/profile/actions";

// The ⋯ menu on another member's profile (IA10, D-074): Share (public profiles only) and Block with the J5 facts
// in the confirmation (D-075). Mute and Report join the menu in step 5.9 with their own flows (SAFE-01, SAFE-03).
// The blocker's own view (J4 B state) offers Unblock.

export function ProfileMenu({
  targetId,
  username,
  displayName,
  shareable,
  shareUrl,
}: {
  targetId: string;
  username: string;
  displayName: string;
  shareable: boolean;
  shareUrl: string;
}) {
  const t = useTranslations("profile");
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const share = async (close: () => void) => {
    close();
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

  const block = (close: () => void) =>
    startTransition(async () => {
      const r = await blockAction(targetId);
      close();
      if (r.ok) {
        toast.show(t("blocked", { username }));
        router.refresh();
      } else toast.show(t(`error.${r.reason}`));
    });

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
        {(close) => (
          <div className="menu">
            {shareable ? (
              <button type="button" className="menu-item" onClick={() => share(close)}>
                <IconShare />
                {t("share")}
              </button>
            ) : null}
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                close();
                setConfirm(true);
              }}
            >
              <IconBlock />
              {t("block")}
            </button>
            <p className="menu-note">{t("moreSoon")}</p>
          </div>
        )}
      </Dialog>
      <Dialog title={t("blockTitle", { username })} isOpen={confirm} onOpenChange={setConfirm}>
        {(close) => (
          <div className="form-stack">
            <ul className="facts">
              <li>{t("blockFact1")}</li>
              <li>{t("blockFact2")}</li>
              <li>{t("blockFact3")}</li>
            </ul>
            <p className="hint">{t("blockNote")}</p>
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                aria-disabled={pending || undefined}
                onClick={() => !pending && block(close)}
              >
                {t("blockConfirm")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

export function UnblockButton({ targetId, username }: { targetId: string; username: string }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      aria-disabled={pending || undefined}
      onClick={() =>
        !pending &&
        startTransition(async () => {
          const r = await unblockAction(targetId);
          if (r.ok) {
            toast.show(t("unblocked", { username }));
            router.refresh();
          } else toast.show(t(`error.${r.reason}`));
        })
      }
    >
      {t("unblock")}
    </button>
  );
}
