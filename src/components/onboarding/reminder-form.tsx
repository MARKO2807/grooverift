"use client";

import { useActionState, useId, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/auth/actions";
import { reminderAction } from "@/lib/onboarding/actions";
import { IconBell, IconClock, IconPlusSquare, IconPulse } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ErrorSummary, useFormErrorFocus } from "@/components/ui/form-status";
import { useFormStatus } from "react-dom";

const TIMES = ["07:00", "08:00", "09:00", "12:00", "17:00", "20:00", "22:00"] as const;

function Buttons({ notNow, turnOn, busy }: { notNow: string; turnOn: string; busy: string }) {
  const { pending } = useFormStatus();
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
      >
        <IconBell />
        {pending ? busy : turnOn}
      </button>
    </div>
  );
}

/**
 * ONB-08 (D-063 (5), D-086 (3)): the Daily Drop reminder, opt-in, at a local time in the browser's zone (J1 E12:
 * the zone is shown in words). Step 5.4 saves the preference; the browser permission prompt and the subscription
 * come with the service worker in step 5.12, after the tap on "Uključi" and never before (IA §14).
 */
export function ReminderForm({
  initial,
}: {
  initial: { enabled: boolean; localTime: string; timeZone: string } | null;
}) {
  const t = useTranslations("join.reminder");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(reminderAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  useFormErrorFocus(state, formRef, summaryRef);
  const id = useId();
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
      <Buttons notNow={t("notNow")} turnOn={t("turnOn")} busy={t("submitting")} />
    </form>
  );
}
