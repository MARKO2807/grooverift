"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { Dialog } from "@/components/ui/dialog";
import { IconBell, IconBlock, IconMore, IconPencil, IconShare, IconX } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { deleteAnswerAction } from "@/lib/drop/actions";
import { CLAMP_CHARS, type AnswerCardData } from "@/lib/drop/rules";
import { blockAction } from "@/lib/profile/actions";
import { ReactionButton } from "./reaction-button";
import { When } from "./when";

// One answer (HUB-02, HUB-03; J3, pulse answerItem): an article whose heading names the author, the neutral date
// (D-036), the text collapsed after a few lines with a button (E14), the reaction (D-056) and the comments link.
// The viewer's own answer shows its count without a button, and Edit and Delete. Muted authors collapse to one
// line with "Prikaži" (SAFE-03, the author is never told). The ⋯ menu offers the link and Block (D-075); Mute
// and Report join it in step 5.9 with their own flows.

// i18n-keys: drop.error.signedOut drop.error.notAllowed drop.error.notAvailable drop.error.alreadyAnswered
// i18n-keys: drop.error.tooMany drop.error.paused drop.error.tooLong drop.error.empty drop.error.generic

export const EDIT_EVENT = "gr:edit-answer";

export function AnswerCard({
  a,
  date,
  headingLevel = 3,
  solo = false,
  shareUrl,
}: {
  a: AnswerCardData;
  date: string;
  headingLevel?: 2 | 3;
  /** On the answer's own page (HUB-03): full text, no comments link, no "Tvoj odgovor" label. */
  solo?: boolean;
  shareUrl: string;
}) {
  const t = useTranslations("drop");
  const toast = useToast();
  const router = useRouter();
  const hid = useId();
  const tid = useId();
  const [open, setOpen] = useState(solo);
  const [shown, setShown] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "block" | null>(null);
  const [pending, startTransition] = useTransition();
  const H = `h${headingLevel}` as const;
  const long = !solo && a.body.length > CLAMP_CHARS;

  if (a.muted && !shown && !solo) {
    return (
      <article className="ans ans-muted" aria-labelledby={hid}>
        <p className="ans-muted-t" id={hid}>
          <IconBell />
          <span>{t("mutedAnswer", { username: a.author.username })}</span>
        </p>
        <button
          type="button"
          className="link"
          onClick={() => setShown(true)}
          aria-describedby={hid}
        >
          {t("show")}
        </button>
      </article>
    );
  }

  const share = async () => {
    setMenu(false);
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.show(t("linkCopied"));
    } catch {
      toast.show(t("linkFailed", { url: shareUrl }));
    }
  };

  const remove = (close: () => void) =>
    startTransition(async () => {
      const r = await deleteAnswerAction(a.id);
      close();
      if (r.ok) {
        toast.show(t("deleted"));
        router.refresh();
      } else toast.show(t(`error.${r.reason}`));
    });

  const block = (close: () => void) =>
    startTransition(async () => {
      const r = await blockAction(a.author.id);
      close();
      if (r.ok) {
        toast.show(t("blocked", { username: a.author.username }));
        router.refresh();
      } else toast.show(t("error.generic"));
    });

  return (
    <article className={`ans${a.mine && !solo ? " ans-mine" : ""}`} aria-labelledby={hid}>
      {a.mine && !solo ? <p className="ans-label">{t("yourAnswer")}</p> : null}
      <header className="ans-head">
        <Avatar name={a.author.displayName} size="sm" />
        <H className="ans-who" id={hid}>
          <Link href={`/@${a.author.username}`} className="name">
            {a.author.displayName}
          </Link>
          <span className="sr-only">, </span>
          <span className="handle">@{a.author.username}</span>
        </H>
        <span className="ans-time">
          <When at={a.createdAt} />
          {a.edited ? <span className="edited">{t("edited")}</span> : null}
        </span>
        {a.mine ? (
          <span />
        ) : (
          <button
            type="button"
            className="iconbtn ans-more"
            aria-label={t("more", { name: a.author.displayName })}
            aria-haspopup="dialog"
            onClick={() => setMenu(true)}
          >
            <IconMore />
          </button>
        )}
      </header>
      <div className={`ans-text${long && !open ? " clamp" : ""}`} id={tid}>
        <p lang={a.language ?? undefined}>{a.body}</p>
      </div>
      {long ? (
        <button
          type="button"
          className="link more-link"
          aria-controls={tid}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? t("readLess") : t("readMore")}
        </button>
      ) : null}
      <div className="ans-actions">
        <ReactionButton
          answerId={a.id}
          own={a.mine}
          initial={{ count: a.reactions, reacted: a.reacted }}
          whoHref={`/drop/${date}/a/${a.id}/reactions`}
        />
        {solo ? null : (
          <Link href={`/drop/${date}/a/${a.id}`} className="comments-btn">
            {a.comments ? t("commentsCount", { count: a.comments }) : t("comment")}
            <span className="sr-only">{t("onAnswerOf", { name: a.author.displayName })}</span>
          </Link>
        )}
      </div>
      {a.mine ? (
        <div className="ans-own">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.dispatchEvent(new CustomEvent(EDIT_EVENT))}
          >
            <IconPencil />
            {t("edit")}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setConfirm("delete")}
          >
            <IconX />
            {t("delete")}
          </button>
        </div>
      ) : null}

      <Dialog
        title={t("moreTitle", { username: a.author.username })}
        isOpen={menu}
        onOpenChange={setMenu}
      >
        <div className="menu">
          <button type="button" className="menu-item" onClick={share}>
            <IconShare />
            {t("shareAnswer")}
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setMenu(false);
              setConfirm("block");
            }}
          >
            <IconBlock />
            {t("blockAuthor", { username: a.author.username })}
          </button>
          <p className="menu-note">{t("moreSoon")}</p>
        </div>
      </Dialog>

      <Dialog
        title={
          confirm === "block" ? t("blockTitle", { username: a.author.username }) : t("deleteTitle")
        }
        isOpen={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        {(close) => (
          <div className="form-stack">
            <p>{confirm === "block" ? t("blockText") : t("deleteText")}</p>
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pending}
                onClick={() => (confirm === "block" ? block(close) : remove(close))}
              >
                {confirm === "block" ? t("blockConfirm") : t("deleteConfirm")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </article>
  );
}

/** A deleted or removed answer that keeps its replies readable (J3 E5, E6). */
export function AnswerGone({
  id,
  date,
  comments,
  removed,
  link = true,
}: {
  id: string;
  date: string;
  comments: number;
  removed: boolean;
  link?: boolean;
}) {
  const t = useTranslations("drop");
  return (
    <div className="com-gone ans-gone">
      <p>{removed ? t("answerRemoved") : t("answerDeleted")}</p>
      {link ? (
        <Link href={`/drop/${date}/a/${id}`} className="link">
          {t("commentsCount", { count: comments })}
        </Link>
      ) : null}
    </div>
  );
}
