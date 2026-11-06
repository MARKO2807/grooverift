"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { Dialog } from "@/components/ui/dialog";
import {
  IconBell,
  IconBlock,
  IconLock,
  IconMore,
  IconUsers,
  IconWarning,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useSafety } from "@/components/safety/safety-dialogs";
import { RestrictionHint, type Restriction } from "@/components/safety/restriction-hint";
import { deleteCommentAction, postCommentAction } from "@/lib/drop/actions";
import { COMMENT_MAX, type DropFailure } from "@/lib/drop/rules";
import { When } from "./when";

// Comments under one answer (HUB-03; J3 "replies", pulse answer screen). Flat in the alpha, oldest first. A blocked
// pair or a hidden account shows "Ovaj komentar nije dostupan." (D-019, S-17); a muted author collapses with
// "Prikaži" (SAFE-03). Other members' comments carry a ⋯ menu with Mute, Block and Report (step 5.9). The composer names its audience (D-020: everyone who can see the answer, also when the
// commenter's profile is private) and keeps the text when posting fails (JR4).

// i18n-keys: drop.error.signedOut drop.error.notAllowed drop.error.notAvailable drop.error.alreadyAnswered
// i18n-keys: drop.error.tooMany drop.error.paused drop.error.tooLong drop.error.empty drop.error.generic
// i18n-keys: drop.error.restricted

export type CommentData =
  | {
      kind: "comment";
      id: string;
      author: { id: string; username: string; displayName: string };
      body: string;
      createdAt: string;
      mine: boolean;
      muted: boolean;
    }
  | { kind: "unavailable"; id: string };

function CommentRow({ c }: { c: Extract<CommentData, { kind: "comment" }> }) {
  const t = useTranslations("drop");
  const toast = useToast();
  const router = useRouter();
  const hid = useId();
  const [shown, setShown] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const ts = useTranslations("safety");
  const flat = c.body.replace(/s+/g, " ").trim();
  const safety = useSafety({
    person: c.author,
    report: {
      type: "comment",
      id: c.id,
      preview: flat.length > 140 ? `${flat.slice(0, 139).trimEnd()}…` : flat,
    },
    muted: c.muted,
  });
  const pick = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  if (c.muted && !shown)
    return (
      <p className="com-gone com-muted">
        <span>{t("mutedComment", { username: c.author.username })}</span>
        <button
          type="button"
          className="link"
          onClick={() => setShown(true)}
          aria-label={t("showComment", { username: c.author.username })}
        >
          {t("show")}
        </button>
      </p>
    );

  const remove = (close: () => void) =>
    startTransition(async () => {
      const r = await deleteCommentAction(c.id);
      close();
      if (r.ok) {
        toast.show(t("commentDeleted"));
        router.refresh();
      } else toast.show(t(`error.${r.reason}`));
    });

  return (
    <article className="com" id={`c-${c.id}`} aria-labelledby={hid}>
      <header className="ans-head">
        <Avatar name={c.author.displayName} size="sm" />
        <h3 className="ans-who" id={hid}>
          <Link href={`/@${c.author.username}`} className="name">
            {c.author.displayName}
          </Link>
          <span className="sr-only">, </span>
          <span className="handle">@{c.author.username}</span>
        </h3>
        <span className="ans-time">
          <When at={c.createdAt} />
        </span>
        {c.mine ? null : (
          <button
            type="button"
            className="iconbtn ans-more"
            aria-label={ts("menu.commentMore", { name: c.author.displayName })}
            aria-haspopup="dialog"
            onClick={() => setMenu(true)}
          >
            <IconMore />
          </button>
        )}
      </header>
      <p className="com-text">{c.body}</p>
      {c.mine ? null : (
        <>
          <Dialog
            title={ts("menu.commentTitle", { username: c.author.username })}
            isOpen={menu}
            onOpenChange={setMenu}
          >
            <div className="menu">
              {safety.muted ? null : (
                <button type="button" className="menu-item" onClick={pick(safety.openMute)}>
                  <IconBell />
                  {ts("menu.mute", { username: c.author.username })}
                </button>
              )}
              <button type="button" className="menu-item" onClick={pick(safety.openBlock)}>
                <IconBlock />
                {ts("menu.block", { username: c.author.username })}
              </button>
              <button type="button" className="menu-item" onClick={pick(safety.openReport)}>
                <IconWarning />
                {ts("menu.reportComment")}
              </button>
            </div>
          </Dialog>
          {safety.dialogs}
        </>
      )}
      {c.mine ? (
        <button type="button" className="link com-del" onClick={() => setConfirm(true)}>
          {t("delete")}
          <span className="sr-only">{t("yourComment")}</span>
        </button>
      ) : null}
      <Dialog title={t("deleteCommentTitle")} isOpen={confirm} onOpenChange={setConfirm}>
        {(close) => (
          <div className="form-stack">
            <p>{t("deleteCommentText")}</p>
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pending}
                onClick={() => remove(close)}
              >
                {t("deleteConfirm")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </article>
  );
}

export function CommentList({ comments }: { comments: CommentData[] }) {
  const t = useTranslations("drop");
  if (!comments.length)
    return (
      <div className="empty-b empty-quiet">
        <p className="empty-t">{t("noComments")}</p>
        <p>{t("noCommentsText")}</p>
      </div>
    );
  return (
    <ul className="com-list">
      {comments.map((c) => (
        <li key={c.id}>
          {c.kind === "unavailable" ? (
            <p className="com-gone">{t("commentUnavailable")}</p>
          ) : (
            <CommentRow c={c} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function CommentForm({
  answerId,
  privateProfile,
  restriction = null,
}: {
  answerId: string;
  privateProfile: boolean;
  restriction?: Restriction | null;
}) {
  const t = useTranslations("drop");
  const toast = useToast();
  const router = useRouter();
  const fid = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<DropFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const length = text.trim().length;
  const over = length > COMMENT_MAX;
  if (restriction) return <RestrictionHint r={restriction} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!length) return setError("empty");
    if (over) return setError("tooLong");
    setError(null);
    startTransition(async () => {
      const r = await postCommentAction(answerId, text);
      if (r.ok) {
        setText("");
        toast.show(t("commentPosted"));
        router.refresh();
      } else setError(r.reason);
    });
  };

  return (
    <form className="composer composer-comment" onSubmit={submit} noValidate>
      <label className="composer-label" htmlFor={`${fid}-f`}>
        {t("commentLabel")}
      </label>
      <textarea
        id={`${fid}-f`}
        className="textarea"
        rows={3}
        value={text}
        aria-invalid={error === "empty" || error === "tooLong" || over ? true : undefined}
        aria-describedby={`${fid}-n${error ? ` ${fid}-e` : ""}`}
        onChange={(e) => setText(e.target.value)}
      />
      <p className={`char-count${over ? " is-over" : ""}`} id={`${fid}-n`}>
        {t("chars", { count: length, max: COMMENT_MAX })}
      </p>
      {privateProfile ? (
        <div className="notice" id={`${fid}-a`}>
          <IconLock />
          <p>{t.rich("commentAudiencePrivate", { b: (c) => <b>{c}</b> })}</p>
        </div>
      ) : (
        <p className="aud" id={`${fid}-a`}>
          <IconUsers />
          <span>{t("commentAudience")}</span>
        </p>
      )}
      {error ? (
        <div className="post-err" role="alert" id={`${fid}-e`}>
          <IconWarning />
          <p>{t(`error.${error}`)}</p>
        </div>
      ) : null}
      <div className="composer-actions">
        <button
          type="submit"
          className="btn btn-primary"
          aria-describedby={`${fid}-a`}
          disabled={pending}
        >
          {error === "generic" ? t("retry") : t("commentPost")}
        </button>
      </div>
    </form>
  );
}
