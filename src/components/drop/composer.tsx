"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import {
  IconCheck,
  IconLock,
  IconPause,
  IconPencil,
  IconUsers,
  IconWarning,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { RestrictionHint, type Restriction } from "@/components/safety/restriction-hint";
import { editAnswerAction, postAnswerAction } from "@/lib/drop/actions";
import { ANSWER_MAX, type DropFailure, type PostImageData } from "@/lib/drop/rules";
import { EDIT_EVENT } from "./answer-card";
import { ImagePicker, imageForm, type PickedImage } from "./image-picker";

// The dock and the answer composer (HUB-02; J3 "read and answer", pulse dock and composerForm). The dock sits at
// the foot of the column above the tab bar; it opens the composer in a sheet. The composer carries the question
// id that was on screen (E1). The audience line (or the private-profile notice, D-021) is tied to the Post button
// with aria-describedby, so screen readers hear it before posting. A failed post keeps the text with Retry (JR4);
// "already answered" (E4, two tabs) keeps it too. The draft lives in memory while the page is open (E10).

// i18n-keys: drop.error.signedOut drop.error.notAllowed drop.error.notAvailable drop.error.alreadyAnswered
// i18n-keys: drop.error.tooMany drop.error.paused drop.error.tooLong drop.error.empty drop.error.generic
// i18n-keys: drop.error.restricted drop.error.imageTooLarge drop.error.imageFormat drop.error.imageOff

export const COMPOSE_EVENT = "gr:compose";

export function AnswerDock({
  questionId,
  mine,
  privateProfile,
  paused,
  autoOpen = false,
  restriction = null,
  imagesOn = false,
}: {
  questionId: string;
  mine: { id: string; body: string; image?: PostImageData | null } | null;
  /** D-120: the `post_images` flag; off hides "Dodaj sliku" (an existing image can still be removed). */
  imagesOn?: boolean;
  privateProfile: boolean;
  paused: boolean;
  /** SAFE-07: a posting restriction replaces the field (and Edit) with the hint (D-075 (5) A). */
  restriction?: Restriction | null;
  /** "Odgovori" on Home and Hub links here with ?compose=1: the sheet opens once the page is ready. */
  autoOpen?: boolean;
}) {
  const t = useTranslations("drop");
  const toast = useToast();
  const router = useRouter();
  const audId = useId();
  const errId = useId();
  const countId = useId();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<DropFailure | null>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [pending, startTransition] = useTransition();
  const opened = useRef(false);

  const startEdit = () => {
    if (!mine) return;
    setEditing(true);
    setDraft(mine.body);
    setPicked(mine.image ? { kind: "kept", image: mine.image, alt: mine.image.alt ?? "" } : null);
    setError(null);
    setOpen(true);
  };

  useEffect(() => {
    const onEdit = () => startEdit();
    const onCompose = () => {
      setEditing(false);
      setOpen(true);
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    window.addEventListener(COMPOSE_EVENT, onCompose);
    return () => {
      window.removeEventListener(EDIT_EVENT, onEdit);
      window.removeEventListener(COMPOSE_EVENT, onCompose);
    };
  });

  useEffect(() => {
    if (autoOpen && !mine && !paused && !restriction && !opened.current) {
      opened.current = true;
      // Opening a sheet is a client-only step after hydration; the URL keeps no trace of it.
      window.history.replaceState(null, "", window.location.pathname);
      window.dispatchEvent(new CustomEvent(COMPOSE_EVENT));
    }
  }, [autoOpen, mine, paused, restriction]);

  if (paused)
    return (
      <div className="dock dock-locked">
        <p className="dock-done">
          <IconPause />
          <span>{t("dockPaused")}</span>
        </p>
      </div>
    );

  if (restriction)
    return (
      <div className="dock dock-locked">
        {mine ? (
          <p className="dock-done">
            <IconCheck />
            <span>{t("dockDone")}</span>
          </p>
        ) : null}
        <RestrictionHint r={restriction} />
      </div>
    );

  const length = draft.trim().length;
  const over = length > ANSWER_MAX;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!length) return setError("empty");
    if (over) return setError("tooLong");
    setError(null);
    startTransition(async () => {
      const files = imageForm(picked, editing ? (mine?.image ?? null) : null);
      const r =
        editing && mine
          ? await editAnswerAction(mine.id, draft, files)
          : await postAnswerAction(questionId, draft, files);
      if (r.ok) {
        setOpen(false);
        setDraft("");
        setPicked(null);
        toast.show(editing ? t("saved") : t("posted"));
        router.refresh();
      } else setError(r.reason);
    });
  };

  const preview = draft.trim();
  return (
    <>
      {mine ? (
        <div className="dock">
          <p className="dock-done">
            <IconCheck />
            <span>{t("dockDone")}</span>
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
            {t("edit")}
          </button>
        </div>
      ) : (
        <div className="dock">
          <button
            type="button"
            className={`dock-field${preview ? " has-draft" : ""}`}
            aria-haspopup="dialog"
            onClick={() => {
              setEditing(false);
              setOpen(true);
            }}
          >
            <IconPencil />
            <span>
              {preview ? preview.slice(0, 48) + (preview.length > 48 ? "…" : "") : t("dockField")}
            </span>
          </button>
        </div>
      )}
      <Dialog
        title={editing ? t("editTitle") : t("composeTitle")}
        isOpen={open}
        onOpenChange={setOpen}
      >
        {(close) => (
          <form className="composer" onSubmit={submit} noValidate>
            <label className="sr-only" htmlFor={`${audId}-f`}>
              {editing ? t("editLabel") : t("composeLabel")}
            </label>
            <textarea
              id={`${audId}-f`}
              className="textarea"
              rows={6}
              value={draft}
              placeholder={t("placeholder")}
              aria-invalid={error === "empty" || error === "tooLong" || over ? true : undefined}
              aria-describedby={`${countId}${error ? ` ${errId}` : ""}`}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className={`char-count${over ? " is-over" : ""}`} id={countId}>
              {t("chars", { count: length, max: ANSWER_MAX })}
            </p>
            {imagesOn || picked ? (
              <ImagePicker
                value={picked}
                onChange={(next) => {
                  setError(null);
                  setPicked(next);
                }}
                onProblem={setError}
              />
            ) : null}
            {privateProfile ? (
              <div className="notice" id={audId}>
                <IconLock />
                <p>{t.rich("audiencePrivate", { b: (c) => <b>{c}</b> })}</p>
              </div>
            ) : (
              <p className="aud" id={audId}>
                <IconUsers />
                <span>{t("audience")}</span>
              </p>
            )}
            {error ? (
              <div className="post-err" role="alert" id={errId}>
                <IconWarning />
                <p>{t(`error.${error}`)}</p>
              </div>
            ) : null}
            <div className="composer-actions">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                aria-describedby={audId}
                disabled={pending}
              >
                {error === "generic" ? t("retry") : editing ? t("save") : t("post")}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

/** The "Odgovori" call to action on the question page itself: opens the dock's sheet. */
export function ComposeButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary btn-cta"
      aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new CustomEvent(COMPOSE_EVENT))}
    >
      {label}
    </button>
  );
}
