"use client";

import { useActionState, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { reminderAction } from "@/lib/onboarding/actions";
import { subscribeAction } from "@/lib/push/actions";
import { subscribeBrowser } from "@/lib/push/browser";
import { IconBell, IconClock, IconPlusSquare, IconPulse } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, useFormErrorFocus } from "@/components/ui/form-status";
import { useFormStatus } from "react-dom";

const TIMES = ["07:00", "08:00", "09:00", "12:00", "17:00", "20:00", "22:00"] as const;

function Buttons({
  notNow,
  turnOn,
  busy,
  asking,
  onTurnOn,
}: {
  notNow: string;
  turnOn: string;
  busy: string;
  asking: boolean;
  onTurnOn: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending: submitting } = useFormStatus();
  const pending = submitting || asking;
  return (
    <div className="foot-row">
      <button
        type="submit"
        name="reminder"
        value="off"
        className="btn btn-secondary"
        aria-disabled={pending || undefined}
      >
        {pending ? busy : notNow}
      </button>
      <button
        type="submit"
        name="reminder"
        value="on"
        className="btn btn-primary"
        aria-disabled={pending || undefined}
        onClick={onTurnOn}
      >
        <IconBell />
        {pending ? busy : turnOn}
      </button>
    </div>
  );
}

/**
 * ONB-08 (D-063 (5), D-086 (3)): the Daily Drop reminder, opt-in, at a local time in the browser's zone (J1 E12:
 * the zone is shown in words). "Uključi" first asks the browser for permission and subscribes this device (step
 * 5.12; after the tap and never before, IA §14), then saves the preference. A refusal or a browser without push
 * (an iPhone outside the Home Screen) still saves the choice; SET-06 turns the device on later.
 */
export function ReminderForm({
  initial,
  publicKey,
}: {
  initial: { enabled: boolean; localTime: string; timeZone: string } | null;
  publicKey: string | null;
}) {
  const t = useTranslations("join.reminder");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(reminderAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
  const [asking, setAsking] = useState(false);
  const onTurnOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    // requestSubmit below does not fire this handler again, so the form is submitted once.
    e.preventDefault();
    if (asking) return;
    const button = e.currentTarget;
    setAsking(true);
    void (async () => {
      if (publicKey) {
        const s = await subscribeBrowser(publicKey);
        if (s.ok) await subscribeAction(s.subscription);
      }
      setAsking(false);
      formRef.current?.requestSubmit(button);
    })();
  };
  // The browser's zone is a client-only value: the server renders the default and the client takes over.
  const detected = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zagreb";
      } catch {
        return "Europe/Zagreb";
      }
    },
    () => "Europe/Zagreb",
  );
  const zone = initial?.timeZone ?? detected;
  const zoneWords = zone.split("/").pop()?.replaceAll("_", " ") ?? zone;
  const err = state.fieldErrors?.timeZone ? te(state.fieldErrors.timeZone) : null;

  return (
    <form ref={formRef} action={action} className="form-stack" noValidate>
      <p className="lead">{t("lead")}</p>
      {state.error || err ? (
        <ErrorSummary summaryRef={summaryRef}>
          <Notice kind="error">{state.error ? te(state.error) : err}</Notice>
        </ErrorSummary>
      ) : null}
      <div
        className="notif"
        role="img"
        aria-label={t("exampleLabel", { title: t("exampleTitle"), question: t("exampleQ") })}
      >
        <span className="notif-app" aria-hidden="true">
          <IconPulse />
        </span>
        <span className="notif-body" aria-hidden="true">
          <span className="notif-top">
            <b>GrooveRift</b>
            <span>{t("now")}</span>
          </span>
          <span className="notif-t">{t("exampleTitle")}</span>
          <span className="notif-q">{t("exampleQ")}</span>
        </span>
      </div>
      <p className="rift-note">{t("note")}</p>
      <div className="rem-row">
        <label className="label" htmlFor={id}>
          {t("timeLabel")}
        </label>
        <select
          id={id}
          name="localTime"
          className="select rem-time"
          defaultValue={initial?.localTime ?? "12:00"}
        >
          {TIMES.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
        <p className="rem-tz">
          <IconClock />
          <span>{t("zone", { zone: zoneWords })}</span>
        </p>
        <input type="hidden" name="timeZone" value={zone} />
      </div>
      <div className="install">
        <span className="install-ic" aria-hidden="true">
          <IconPlusSquare />
        </span>
        <p className="install-body">
          <span className="install-t">{t("install")}</span>
          <span className="install-d">{t("installText")}</span>
        </p>
      </div>
      <Buttons
        notNow={t("notNow")}
        turnOn={t("turnOn")}
        busy={t("submitting")}
        asking={asking}
        onTurnOn={onTurnOn}
      />
    </form>
  );
}
