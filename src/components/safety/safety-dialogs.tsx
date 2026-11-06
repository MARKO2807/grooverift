"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import {
  IconBell,
  IconBlock,
  IconCheck,
  IconCheckCircle,
  IconInfo,
  IconLock,
  IconWarning,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { blockAction, unblockAction } from "@/lib/profile/actions";
import { muteAction, reportAction, unmuteAction, type SafetyFailure } from "@/lib/safety/actions";
import {
  DETAILS_MAX,
  REPORT_CATEGORIES,
  routesToNoticeForm,
  type ReportCategory,
  type ReportTarget,
} from "@/lib/moderation/rules";

// The three member safety tools (J5, D-075) as one set of dialogs shared by the profile, answer and comment menus:
// SAFE-03 mute with a short confirmation and Undo (D-075 (3) B), SAFE-02 block with the fact list and "Also report"
// (D-075 (2) A), SAFE-01 report in three steps (D-075 (1) A). The dialogs trap focus and give it back to the
// opener (React Aria); step headings take focus so a screen reader hears each step; results use the toast's live
// region. Nothing here tells the other person anything.

// i18n-keys: safety.cat.harassment.name safety.cat.hate.name safety.cat.threat.name safety.cat.sexual.name
// i18n-keys: safety.cat.minor.name safety.cat.impersonation.name safety.cat.spam.name safety.cat.copyright.name
// i18n-keys: safety.cat.ai_generated.name safety.cat.private_info.name safety.cat.other.name
// i18n-keys: safety.cat.harassment.desc safety.cat.hate.desc safety.cat.threat.desc safety.cat.minor.desc
// i18n-keys: safety.cat.impersonation.desc safety.cat.copyright.desc safety.cat.ai_generated.desc
// i18n-keys: safety.cat.private_info.desc safety.target.profile safety.target.answer safety.target.comment
// i18n-keys: safety.error.signedOut safety.error.notAllowed safety.error.notAvailable safety.error.tooMany
// i18n-keys: safety.error.generic safety.error.invalid safety.error.closed safety.error.exists safety.error.copyright

export type SafetyPerson = { id: string; username: string; displayName: string };
export type ReportSubject = { type: ReportTarget; id: string; preview?: string };

type Open = "mute" | "block" | "unblock" | "report" | null;

/**
 * The dialogs for one person. `report` is what the Report item reports (the profile, or one answer or comment);
 * after a block with "Also report" ticked the profile is reported. `afterBlock` lets an answer page leave for a
 * safe place once the author is gone from view (J5 "Back to a safe place").
 */
export function useSafety({
  person,
  report,
  muted = false,
  afterBlock,
}: {
  person: SafetyPerson;
  report: ReportSubject;
  muted?: boolean;
  afterBlock?: () => void;
}) {
  const [open, setOpen] = useState<Open>(null);
  const [subject, setSubject] = useState<ReportSubject>(report);
  const [blocked, setBlocked] = useState(false);
  const [isMuted, setMuted] = useState(muted);

  const startReport = (s: ReportSubject = report) => {
    setSubject(s);
    setOpen("report");
  };

  const dialogs = (
    <>
      <MuteDialog
        person={person}
        isOpen={open === "mute"}
        onClose={() => setOpen(null)}
        onMuted={() => setMuted(true)}
        onUnmuted={() => setMuted(false)}
      />
      <BlockDialog
        person={person}
        isOpen={open === "block"}
        onClose={() => setOpen(null)}
        onBlocked={(alsoReport) => {
          setBlocked(true);
          if (alsoReport) startReport({ type: "profile", id: person.id });
          else afterBlock?.();
        }}
      />
      <UnblockDialog person={person} isOpen={open === "unblock"} onClose={() => setOpen(null)} />
      {open === "report" ? (
        <ReportDialog
          person={person}
          subject={subject}
          muted={isMuted}
          blocked={blocked}
          onClose={() => {
            setOpen(null);
            if (blocked) afterBlock?.();
          }}
          onMute={() => setOpen("mute")}
          onBlock={() => setOpen("block")}
        />
      ) : null}
    </>
  );

  return {
    dialogs,
    muted: isMuted,
    openMute: () => setOpen("mute"),
    openBlock: () => setOpen("block"),
    openUnblock: () => setOpen("unblock"),
    openReport: () => startReport(),
    unmute: () => unmuteNow(),
  };

  // Unmute needs no confirmation: it only shows more (J5 E11).
  async function unmuteNow() {
    const r = await unmuteAction(person.id);
    if (r.ok) setMuted(false);
    return r;
  }
}

function useFail() {
  const t = useTranslations("safety");
  return (reason: SafetyFailure) => t(`error.${reason}`);
}

// ---------------------------------------------------------------- SAFE-03 mute

function MuteDialog({
  person,
  isOpen,
  onClose,
  onMuted,
  onUnmuted,
}: {
  person: SafetyPerson;
  isOpen: boolean;
  onClose: () => void;
  onMuted: () => void;
  onUnmuted: () => void;
}) {
  const t = useTranslations("safety");
  const toast = useToast();
  const router = useRouter();
  const fail = useFail();
  const [pending, start] = useTransition();
  const mute = () =>
    start(async () => {
      const r = await muteAction(person.id);
      onClose();
      if (!r.ok) return toast.show(fail(r.reason));
      onMuted();
      router.refresh();
      toast.show(t("mute.done", { username: person.username }), {
        label: t("mute.undo"),
        onPress: async () => {
          const u = await unmuteAction(person.id);
          if (u.ok) {
            onUnmuted();
            router.refresh();
            toast.show(t("mute.undone"));
          } else toast.show(fail(u.reason));
        },
      });
    });
  return (
    <Dialog
      title={t("mute.title", { username: person.username })}
      isOpen={isOpen}
      onOpenChange={(o) => !o && onClose()}
    >
      {(close) => (
        <div className="form-stack">
          <p>{t("mute.text")}</p>
          <div className="foot-row">
            <button type="button" className="btn btn-secondary" onClick={close}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              aria-disabled={pending || undefined}
              onClick={() => !pending && mute()}
            >
              {t("mute.confirm")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- SAFE-02 block and unblock

function BlockDialog({
  person,
  isOpen,
  onClose,
  onBlocked,
}: {
  person: SafetyPerson;
  isOpen: boolean;
  onClose: () => void;
  onBlocked: (alsoReport: boolean) => void;
}) {
  const t = useTranslations("safety");
  const toast = useToast();
  const router = useRouter();
  const fail = useFail();
  const id = useId();
  const [alsoReport, setAlsoReport] = useState(false);
  const [pending, start] = useTransition();
  const block = () =>
    start(async () => {
      const r = await blockAction(person.id);
      onClose();
      if (!r.ok) return toast.show(fail(r.reason === "wait" ? "generic" : r.reason));
      toast.show(t("block.done", { username: person.username }));
      const report = alsoReport;
      setAlsoReport(false);
      onBlocked(report);
      router.refresh();
    });
  const u = { username: person.username };
  return (
    <Dialog title={t("block.title", u)} isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      {(close) => (
        <div className="form-stack">
          <ul className="facts">
            <li>{t("block.fact1", u)}</li>
            <li>{t("block.fact2")}</li>
            <li>{t("block.fact3")}</li>
            <li>{t("block.fact4")}</li>
            <li>{t("block.fact5")}</li>
          </ul>
          <label className="check-row" htmlFor={`${id}-r`}>
            <input
              id={`${id}-r`}
              type="checkbox"
              checked={alsoReport}
              onChange={(e) => setAlsoReport(e.target.checked)}
            />
            <span>{t("block.alsoReport")}</span>
          </label>
          <div className="foot-row">
            <button type="button" className="btn btn-secondary" onClick={close}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              aria-disabled={pending || undefined}
              onClick={() => !pending && block()}
            >
              {t("block.confirm")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function UnblockDialog({
  person,
  isOpen,
  onClose,
}: {
  person: SafetyPerson;
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("safety");
  const toast = useToast();
  const router = useRouter();
  const fail = useFail();
  const [pending, start] = useTransition();
  const u = { username: person.username };
  const unblock = () =>
    start(async () => {
      const r = await unblockAction(person.id);
      onClose();
      if (!r.ok) return toast.show(fail(r.reason === "wait" ? "generic" : r.reason));
      toast.show(t("unblock.done", u));
      router.refresh();
    });
  return (
    <Dialog title={t("unblock.title", u)} isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      {(close) => (
        <div className="form-stack">
          <ul className="facts">
            <li>{t("unblock.fact1")}</li>
            <li>{t("unblock.fact2", u)}</li>
            <li>{t("unblock.fact3")}</li>
          </ul>
          <div className="foot-row">
            <button type="button" className="btn btn-secondary" onClick={close}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              aria-disabled={pending || undefined}
              onClick={() => !pending && unblock()}
            >
              {t("unblock.confirm")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- SAFE-01 report

function ReportDialog({
  person,
  subject,
  muted,
  blocked,
  onClose,
  onMute,
  onBlock,
}: {
  person: SafetyPerson;
  subject: ReportSubject;
  muted: boolean;
  blocked: boolean;
  onClose: () => void;
  onMute: () => void;
  onBlock: () => void;
}) {
  const t = useTranslations("safety");
  const fail = useFail();
  const id = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cat, setCat] = useState<ReportCategory | null>(null);
  const [pickError, setPickError] = useState(false);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<SafetyFailure | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  // A new step moves focus to its heading (the dialog itself keeps focus inside, WCAG 2.4.3).
  const go = (s: 1 | 2 | 3) => {
    setStep(s);
    requestAnimationFrame(() => heading.current?.focus());
  };

  const send = () =>
    start(async () => {
      if (!cat) return;
      setError(null);
      const r = await reportAction({
        targetType: subject.type,
        targetId: subject.id,
        category: cat,
        details,
      });
      if (r.ok) go(3);
      else setError(r.reason);
    });

  const target = t(`target.${subject.type}`, { username: person.username });
  const over = details.trim().length > DETAILS_MAX;

  return (
    <Dialog title={t("report.title")} isOpen onOpenChange={(o) => !o && onClose()}>
      {(close) => (
        <div className="form-stack report">
          <p className="eyebrow">{t("report.step", { n: step })}</p>
          {step === 1 ? (
            <>
              <fieldset
                className="choices rep-cats"
                aria-describedby={pickError ? `${id}-pe` : undefined}
              >
                <legend className="rep-q">
                  <span ref={heading} tabIndex={-1}>
                    {t("report.question")}
                  </span>
                </legend>
                {REPORT_CATEGORIES.map((c) => (
                  <label key={c} className="choice">
                    <input
                      type="radio"
                      name={`${id}-cat`}
                      value={c}
                      checked={cat === c}
                      onChange={() => {
                        setCat(c);
                        setPickError(false);
                      }}
                    />
                    <span className="choice-mark" aria-hidden="true">
                      <IconCheck />
                    </span>
                    <span className="choice-body">
                      <span className="choice-title">{t(`cat.${c}.name`)}</span>
                      {t.has(`cat.${c}.desc`) ? (
                        <span className="choice-desc">{t(`cat.${c}.desc`)}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </fieldset>
              {pickError ? (
                <div role="alert">
                  <FieldError id={`${id}-pe`} text={t("report.pick")} />
                </div>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => (cat ? go(2) : setPickError(true))}
              >
                {t("report.next")}
              </button>
            </>
          ) : null}

          {step === 2 && cat ? (
            <>
              <h3 className="rep-q" ref={heading} tabIndex={-1}>
                {t(`cat.${cat}.name`)}
              </h3>
              <blockquote className="rep-target">
                <span className="set-d">{target}</span>
                {subject.preview ? <span>{subject.preview}</span> : null}
              </blockquote>
              {routesToNoticeForm(cat) ? (
                <>
                  <div className="notice">
                    <IconInfo />
                    <p>{t("report.copyright")}</p>
                  </div>
                  <Link href="/legal/notice" className="btn btn-primary btn-block">
                    {t("report.openForm")}
                  </Link>
                  <button type="button" className="link" onClick={() => go(1)}>
                    {t("report.back")}
                  </button>
                </>
              ) : (
                <>
                  <div className="field">
                    <label className="label" htmlFor={`${id}-d`}>
                      {t("report.detailsLabel")} <span className="opt">{t("report.optional")}</span>
                    </label>
                    <textarea
                      id={`${id}-d`}
                      className="textarea textarea-sm"
                      rows={3}
                      value={details}
                      placeholder={t("report.detailsHint")}
                      aria-describedby={`${id}-n`}
                      aria-invalid={over || undefined}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                    <p className={`char-count${over ? " is-over" : ""}`} id={`${id}-n`}>
                      {t("report.chars", { count: details.trim().length, max: DETAILS_MAX })}
                    </p>
                  </div>
                  <p className="aud">
                    <IconLock />
                    <span>{t("report.private")}</span>
                  </p>
                  {error ? (
                    <div className="post-err" role="alert">
                      <IconWarning />
                      <p>{fail(error)}</p>
                    </div>
                  ) : null}
                  <div className="foot-row">
                    <button type="button" className="btn btn-secondary" onClick={() => go(1)}>
                      {t("report.back")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      aria-disabled={pending || over || undefined}
                      onClick={() => !pending && !over && send()}
                    >
                      {error === "generic" ? t("report.retry") : t("report.send")}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="sub-hero">
                <IconCheckCircle />
                <h3 className="sub-hero-t" ref={heading} tabIndex={-1}>
                  {t("report.doneTitle")}
                </h3>
                <p className="help">{t("report.doneText")}</p>
              </div>
              {!blocked ? (
                <>
                  <p>{t("report.also", { username: person.username })}</p>
                  <div className="dialog-stack">
                    {!muted ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-block"
                        onClick={onMute}
                      >
                        <IconBell />
                        {t("menu.mute", { username: person.username })}
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-secondary btn-block" onClick={onBlock}>
                      <IconBlock />
                      {t("menu.block", { username: person.username })}
                    </button>
                  </div>
                </>
              ) : null}
              <button type="button" className="btn btn-primary btn-block" onClick={close}>
                {t("report.done")}
              </button>
            </>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
