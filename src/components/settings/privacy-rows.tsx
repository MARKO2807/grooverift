"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { IconCheck, IconGlobe, IconLock, IconSearch, IconUsers } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { PrivacyState } from "@/lib/data/profiles";
import {
  AUDIENCES,
  PRIVACY_SECTIONS,
  type Audience,
  type PrivacySection,
} from "@/lib/profile/constants";
import {
  setAudienceAction,
  setDiscoverableAction,
  setVisibilityAction,
  type ActionFailure,
} from "@/lib/profile/actions";

// SET-05 (D-070 (5), D-030, R-15, JO5): one row per item with its current value; a tap opens a short sheet with
// the choices, nothing pre-selected beyond the current value, equal weight. Switching to public with pending
// requests shows their count first and offers to review them (ACT-02) or continue, which accepts them all.

// i18n-keys: settings.privacy.section.musicDna settings.privacy.section.lists settings.privacy.section.dropHistory
// i18n-keys: settings.privacy.audience.everyone settings.privacy.audience.followers settings.privacy.audience.me
// i18n-keys: settings.privacy.audience.mutuals
// i18n-keys: settings.privacy.audienceDesc.everyone settings.privacy.audienceDesc.followers settings.privacy.audienceDesc.me
// i18n-keys: settings.privacy.visibilityOption.public settings.privacy.visibilityOption.private
// i18n-keys: settings.privacy.visibilityDesc.public settings.privacy.visibilityDesc.private
// i18n-keys: profile.error.signedOut profile.error.notAllowed profile.error.notAvailable profile.error.tooMany
// i18n-keys: profile.error.wait profile.error.generic

type Sheet = "visibility" | PrivacySection | "discoverable" | null;

export function PrivacyRows({ initial }: { initial: PrivacyState }) {
  const t = useTranslations("settings.privacy");
  const te = useTranslations("profile.error");
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, startTransition] = useTransition();
  const fail = (reason: ActionFailure) => toast.show(te(reason));

  const saveVisibility = (v: "public" | "private", acceptPending: boolean, close: () => void) =>
    startTransition(async () => {
      const r = await setVisibilityAction(v, acceptPending);
      close();
      if (!r.ok) return fail(r.reason);
      setState((s) => ({
        ...s,
        visibility: v,
        pendingRequests: v === "public" && acceptPending ? 0 : s.pendingRequests,
      }));
      toast.show(
        v === "public" && r.accepted
          ? t("savedAccepted", { n: r.accepted })
          : t("savedVisibility", { who: t(`visibilityOption.${v}`) }),
      );
    });

  const saveAudience = (section: PrivacySection, a: Audience, close: () => void) =>
    startTransition(async () => {
      const r = await setAudienceAction(section, a);
      close();
      if (!r.ok) return fail(r.reason);
      setState((s) => ({ ...s, [section]: a }));
      toast.show(t("savedSection", { section: t(`section.${section}`), who: t(`audience.${a}`) }));
    });

  const saveDiscoverable = (on: boolean, close: () => void) =>
    startTransition(async () => {
      const r = await setDiscoverableAction(on);
      close();
      if (!r.ok) return fail(r.reason);
      setState((s) => ({ ...s, discoverable: on }));
      toast.show(on ? t("discoverableOnSaved") : t("discoverableOffSaved"));
    });

  const row = (
    key: Exclude<Sheet, null>,
    Icon: React.ComponentType,
    title: string,
    value: string,
  ) => (
    <li key={key}>
      <button
        type="button"
        className="set-link set-link-btn"
        aria-haspopup="dialog"
        onClick={() => setSheet(key)}
      >
        <Icon />
        <span className="set-txt">
          <span className="set-t">{title}</span>
          <span className="set-d">{value}</span>
        </span>
        <span className="link-quiet">{t("change")}</span>
      </button>
    </li>
  );

  return (
    <div className="form-stack">
      <section className="set-group" aria-labelledby="h-pv">
        <h2 id="h-pv" className="set-gt">
          {t("profileGroup")}
        </h2>
        <ul className="set-list">
          {row(
            "visibility",
            state.visibility === "public" ? IconGlobe : IconLock,
            t("visibility"),
            t(`visibilityOption.${state.visibility}`),
          )}
          {row(
            "discoverable",
            IconSearch,
            t("discoverable"),
            state.discoverable ? t("discoverableOn") : t("discoverableOff"),
          )}
        </ul>
        {state.visibility === "private" ? <p className="set-note">{t("privateCap")}</p> : null}
      </section>
      <section className="set-group" aria-labelledby="h-ps">
        <h2 id="h-ps" className="set-gt">
          {t("sectionsGroup")}
        </h2>
        <ul className="set-list">
          {PRIVACY_SECTIONS.map((s) =>
            row(s, IconUsers, t(`section.${s}`), t(`audience.${state[s]}`)),
          )}
        </ul>
      </section>

      <Dialog
        title={t("visibilityTitle")}
        isOpen={sheet === "visibility"}
        onOpenChange={(o) => !o && setSheet(null)}
      >
        {(close) => (
          <VisibilityForm
            value={state.visibility}
            pendingRequests={state.pendingRequests}
            busy={pending}
            onCancel={close}
            onSave={(v, accept) => saveVisibility(v, accept, close)}
          />
        )}
      </Dialog>
      {PRIVACY_SECTIONS.map((s) => (
        <Dialog
          key={s}
          title={t("sectionTitle", { section: t(`section.${s}`) })}
          isOpen={sheet === s}
          onOpenChange={(o) => !o && setSheet(null)}
        >
          {(close) => (
            <ChoiceForm
              name={s}
              options={AUDIENCES.map((a) => ({
                value: a,
                title: t(`audience.${a}`),
                desc: t(`audienceDesc.${a}`),
              }))}
              value={state[s]}
              busy={pending}
              note={state.visibility === "private" ? t("privateCap") : undefined}
              onCancel={close}
              onSave={(v) => saveAudience(s, v as Audience, close)}
            />
          )}
        </Dialog>
      ))}
      <Dialog
        title={t("discoverableTitle")}
        isOpen={sheet === "discoverable"}
        onOpenChange={(o) => !o && setSheet(null)}
      >
        {(close) => (
          <ChoiceForm
            name="discoverable"
            options={[
              { value: "on", title: t("discoverableOn"), desc: t("discoverableOnDesc") },
              { value: "off", title: t("discoverableOff"), desc: t("discoverableOffDesc") },
            ]}
            value={state.discoverable ? "on" : "off"}
            busy={pending}
            onCancel={close}
            onSave={(v) => saveDiscoverable(v === "on", close)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ChoiceForm({
  name,
  options,
  value,
  busy,
  note,
  onCancel,
  onSave,
}: {
  name: string;
  options: { value: string; title: string; desc: string }[];
  value: string;
  busy: boolean;
  note?: string;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const t = useTranslations("settings.privacy");
  const [choice, setChoice] = useState(value);
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (choice !== value) onSave(choice);
        else onCancel();
      }}
    >
      <fieldset className="choices">
        <legend className="sr-only">{t("choose")}</legend>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={choice === o.value}
              onChange={() => setChoice(o.value)}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title">{o.title}</span>
              <span className="choice-desc">{o.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {note ? <p className="hint">{note}</p> : null}
      <div className="foot-row">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn btn-primary" aria-disabled={busy || undefined}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

/** Profile visibility: the same neutral wording as onboarding (D-030); JO5 before the switch to public. */
function VisibilityForm({
  value,
  pendingRequests,
  busy,
  onCancel,
  onSave,
}: {
  value: "public" | "private";
  pendingRequests: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: "public" | "private", acceptPending: boolean) => void;
}) {
  const t = useTranslations("settings.privacy");
  const [choice, setChoice] = useState<"public" | "private">(value);
  const [ask, setAsk] = useState(false);
  if (ask) {
    return (
      <div className="form-stack">
        <p className="set-t">{t("pendingTitle", { n: pendingRequests })}</p>
        <p>{t("pendingText")}</p>
        <div className="foot-row">
          <Link href="/activity/requests" className="btn btn-secondary">
            {t("review")}
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            aria-disabled={busy || undefined}
            onClick={() => !busy && onSave("public", true)}
          >
            {t("continueAccept")}
          </button>
        </div>
      </div>
    );
  }
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (choice === value) return onCancel();
        if (choice === "public" && pendingRequests > 0) return setAsk(true);
        onSave(choice, false);
      }}
    >
      <fieldset className="choices">
        <legend className="sr-only">{t("choose")}</legend>
        {(["public", "private"] as const).map((v) => (
          <label key={v} className="choice">
            <input
              type="radio"
              name="visibility"
              value={v}
              checked={choice === v}
              onChange={() => setChoice(v)}
            />
            <span className="choice-mark" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="choice-body">
              <span className="choice-title">{t(`visibilityOption.${v}`)}</span>
              <span className="choice-desc">{t(`visibilityDesc.${v}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="hint">{choice === "private" ? t("toPrivateNote") : t("toPublicNote")}</p>
      <div className="foot-row">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn btn-primary" aria-disabled={busy || undefined}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}
