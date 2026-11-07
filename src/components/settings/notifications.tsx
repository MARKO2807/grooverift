"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { IconDevice } from "@/components/ui/icons";
import {
  pauseAction,
  setPushTypeAction,
  setReminderAction,
  subscribeAction,
  unsubscribeAction,
  type PushResult,
} from "@/lib/push/actions";
import {
  browserPushState,
  subscribeBrowser,
  unsubscribeBrowser,
  type BrowserPushState,
} from "@/lib/push/browser";

// i18n-keys: push.error.signedOut push.error.unavailable push.error.tooMany push.error.generic push.error.invalid
// i18n-keys: push.error.notOn push.error.denied push.error.failed

const TIMES = ["07:00", "08:00", "09:00", "12:00", "17:00", "20:00", "22:00"] as const;
type TypeKey = "comment" | "reaction" | "follow";

export type NotificationsProps = {
  publicKey: string;
  device: { on: boolean; pausedUntil: string | null };
  types: Record<TypeKey, boolean>;
  reminder: { enabled: boolean; localTime: string; timeZone: string };
};

const isPhone = () => /Android|iPhone|iPad|iPod|Mobile/.test(navigator.userAgent);

function SwitchRow({
  id,
  title,
  text,
  on,
  onToggle,
}: {
  id: string;
  title: string;
  text?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="set-row set-row-switch">
      <span className="set-txt">
        <span className="set-t" id={`${id}-l`}>
          {title}
        </span>
        {text ? (
          <span className="set-d" id={`${id}-d`}>
            {text}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-l`}
        aria-describedby={text ? `${id}-d` : undefined}
        onClick={onToggle}
      >
        <span />
      </button>
    </li>
  );
}

/**
 * SET-06 (D-071 option B, D-072): "this phone" on top with one switch and the pause; below it the Daily Drop
 * reminder with its time and the people types, quiet (disabled) while this device is off or paused. Activity
 * always shows everything; this screen is only about what reaches the device. The browser's own state is read
 * after mount: a subscription the browser no longer has (or a permission it withdrew) is turned off on the
 * server too, so the screen never says "on" for a device that cannot receive.
 */
export function NotificationsScreen({ publicKey, device, types, reminder }: NotificationsProps) {
  const t = useTranslations("push");
  const te = useTranslations("push.error");
  const f = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [browser, setBrowser] = useState<BrowserPushState | null>(null);
  const [typeState, setTypeState] = useState(types);
  const [rem, setRem] = useState(reminder);
  const phone = useSyncExternalStore(
    () => () => {},
    isPhone,
    () => true,
  );
  const reconciled = useRef(false);

  useEffect(() => {
    let alive = true;
    void browserPushState().then((s) => {
      if (alive) setBrowser(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The server says "on" but this browser cannot receive: turn it off there as well (once).
  useEffect(() => {
    if (!browser || !device.on || reconciled.current) return;
    if (browser.subscribed && browser.permission === "granted") return;
    reconciled.current = true;
    void unsubscribeAction().then(() => router.refresh());
  }, [browser, device.on, router]);

  const fail = (r: PushResult) => {
    if (!r.ok) toast.show(te(r.reason));
    return r.ok;
  };

  const usable =
    browser?.support === "supported" && browser.permission !== "denied" ? browser : null;
  const on = device.on && !!usable && usable.subscribed;
  const paused = on && device.pausedUntil ? new Date(device.pausedUntil) : null;
  const active = on && !paused;

  const desc = !browser
    ? t("deviceChecking")
    : browser.support === "needs-install"
      ? t("deviceInstall")
      : browser.support === "unsupported"
        ? t("deviceUnsupported")
        : browser.permission === "denied"
          ? t("deviceDenied")
          : !on
            ? t("deviceOff")
            : paused
              ? t("devicePaused", {
                  time: f.dateTime(paused, {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("deviceOn");

  const toggleDevice = () => {
    if (pending || !usable) return;
    start(async () => {
      if (on) {
        const r = await unsubscribeAction();
        if (!fail(r)) return;
        await unsubscribeBrowser();
      } else {
        const s = await subscribeBrowser(publicKey);
        if (!s.ok) {
          toast.show(te(s.reason === "denied" ? "denied" : "failed"));
          setBrowser(await browserPushState());
          return;
        }
        if (!fail(await subscribeAction(s.subscription))) return;
      }
      setBrowser(await browserPushState());
      router.refresh();
    });
  };

  const pause = (choice: "1h" | "3h" | "morning" | null) => {
    if (pending) return;
    start(async () => {
      if (fail(await pauseAction(choice))) router.refresh();
    });
  };

  const toggleType = (key: TypeKey) => {
    const next = !typeState[key];
    setTypeState((s) => ({ ...s, [key]: next }));
    start(async () => {
      if (!fail(await setPushTypeAction(key, next))) setTypeState((s) => ({ ...s, [key]: !next }));
    });
  };

  const saveReminder = (enabled: boolean, localTime: string) => {
    const before = rem;
    setRem({ ...rem, enabled, localTime });
    start(async () => {
      if (!fail(await setReminderAction(enabled, localTime))) setRem(before);
    });
  };

  const zone = (rem.timeZone.split("/").pop() ?? rem.timeZone).replaceAll("_", " ");

  return (
    <div className="set-body">
      <section className={`ntf-dev${active ? "" : " is-off"}`} aria-labelledby={`${id}-dev-l`}>
        <div className="ntf-dev-top">
          <span className="set-ic-wrap" aria-hidden="true">
            <IconDevice />
          </span>
          <span className="set-txt">
            <span className="set-t" id={`${id}-dev-l`}>
              {phone ? t("devicePhone") : t("deviceOther")}
            </span>
            <span className="set-d" id={`${id}-dev-d`} aria-live="polite">
              {desc}
            </span>
          </span>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={on}
            aria-labelledby={`${id}-dev-l`}
            aria-describedby={`${id}-dev-d`}
            aria-disabled={!usable || pending || undefined}
            onClick={toggleDevice}
          >
            <span />
          </button>
        </div>
        {on && paused ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm ntf-resume"
            aria-disabled={pending || undefined}
            onClick={() => pause(null)}
          >
            {t("resume")}
          </button>
        ) : on ? (
          <div className="ntf-pause" role="group" aria-labelledby={`${id}-pause-l`}>
            <span className="set-d" id={`${id}-pause-l`}>
              {t("pauseLabel")}
            </span>
            <div className="chips">
              <button type="button" className="chip" onClick={() => pause("1h")}>
                {t("pause1h")}
              </button>
              <button type="button" className="chip" onClick={() => pause("3h")}>
                {t("pause3h")}
              </button>
              <button type="button" className="chip" onClick={() => pause("morning")}>
                {t("pauseMorning")}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <fieldset className="ntf-types" disabled={!active}>
        <legend className="sr-only">{t("types")}</legend>
        <section className="set-group" aria-labelledby={`${id}-g-drop`}>
          <h2 className="set-gt" id={`${id}-g-drop`}>
            {t("groupDrop")}
          </h2>
          <ul className="set-list">
            <SwitchRow
              id={`${id}-rem`}
              title={t("reminder")}
              text={t("reminderText")}
              on={rem.enabled}
              onToggle={() => saveReminder(!rem.enabled, rem.localTime)}
            />
            <li className="set-row set-row-plain">
              <label className="set-t" htmlFor={`${id}-time`}>
                {t("time")}
              </label>
              <select
                id={`${id}-time`}
                className="select rem-time"
                value={rem.localTime}
                aria-describedby={`${id}-zone`}
                onChange={(e) => saveReminder(rem.enabled, e.target.value)}
              >
                {TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </li>
          </ul>
          <p className="set-note" id={`${id}-zone`}>
            {t("zone", { zone })}
          </p>
        </section>
        <section className="set-group" aria-labelledby={`${id}-g-people`}>
          <h2 className="set-gt" id={`${id}-g-people`}>
            {t("groupPeople")}
          </h2>
          <ul className="set-list">
            <SwitchRow
              id={`${id}-comment`}
              title={t("comment")}
              on={typeState.comment}
              onToggle={() => toggleType("comment")}
            />
            <SwitchRow
              id={`${id}-reaction`}
              title={t("reaction")}
              text={t("reactionText")}
              on={typeState.reaction}
              onToggle={() => toggleType("reaction")}
            />
            <SwitchRow
              id={`${id}-follow`}
              title={t("follow")}
              on={typeState.follow}
              onToggle={() => toggleType("follow")}
            />
          </ul>
          <p className="set-note">{t("privacyNote")}</p>
        </section>
      </fieldset>
      <p className="set-note">{t("mailNote")}</p>
    </div>
  );
}
