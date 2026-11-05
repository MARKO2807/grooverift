"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { IconBlock, IconMore, IconUserMinus } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { blockAction, removeFollowerAction } from "@/lib/profile/actions";

/**
 * ⋯ on a row of the own followers list when the profile is private (D-069, D-074 (7)): "Remove follower" and
 * "Block", each through a confirmation. Removing sends no notification; the person can ask again later.
 */
export function RemoveFollowerMenu({
  followerId,
  username,
  displayName,
}: {
  followerId: string;
  username: string;
  displayName: string;
}) {
  const t = useTranslations("profile");
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<"remove" | "block" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (close: () => void) =>
    startTransition(async () => {
      const r =
        confirm === "block"
          ? await blockAction(followerId)
          : await removeFollowerAction(followerId);
      close();
      if (r.ok) {
        toast.show(confirm === "block" ? t("blocked", { username }) : t("lists.removed"));
        router.refresh();
      } else toast.show(t(`error.${r.reason}`));
    });

  return (
    <>
      <button
        type="button"
        className="iconbtn"
        aria-label={t("lists.rowMore", { name: displayName })}
        aria-haspopup="dialog"
        onClick={() => setMenu(true)}
      >
        <IconMore />
      </button>
      <Dialog title={t("moreTitle", { username })} isOpen={menu} onOpenChange={setMenu}>
        {(close) => (
          <div className="menu">
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                close();
                setConfirm("remove");
              }}
            >
              <IconUserMinus />
              {t("lists.remove")}
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                close();
                setConfirm("block");
              }}
            >
              <IconBlock />
              {t("block")}
            </button>
          </div>
        )}
      </Dialog>
      <Dialog
        title={
          confirm === "block" ? t("blockTitle", { username }) : t("lists.removeTitle", { username })
        }
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        {(close) => (
          <div className="form-stack">
            {confirm === "block" ? (
              <>
                <ul className="facts">
                  <li>{t("blockFact1")}</li>
                  <li>{t("blockFact2")}</li>
                  <li>{t("blockFact3")}</li>
                </ul>
                <p className="hint">{t("blockNote")}</p>
              </>
            ) : (
              <p>{t("lists.removeText")}</p>
            )}
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                aria-disabled={pending || undefined}
                onClick={() => !pending && run(close)}
              >
                {confirm === "block" ? t("blockConfirm") : t("lists.removeConfirm")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
