"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { reactAction } from "@/lib/drop/actions";

// The one reaction (D-056): an audio wave, icon only, with the count visible to everyone. A toggle button whose
// accessible name carries its name, the count and "ti" when pressed (J3 accessibility notes). The own answer
// shows the count without a button. The count links to who reacted (POST-04) when there is someone to show.

const Wave = () => (
  <svg className="wave-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline className="wave" points="2,12 7,12 9.5,5 12,19 14.5,8 16,12 22,12" />
  </svg>
);

export function ReactionButton({
  answerId,
  own,
  initial,
  whoHref,
}: {
  answerId: string;
  own: boolean;
  initial: { count: number; reacted: boolean };
  whoHref: string;
}) {
  const t = useTranslations("drop");
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [pressing, setPressing] = useState(false);
  const [, startTransition] = useTransition();
  const label = t("reactionName", { count: state.count });

  const who =
    state.count > 0 ? (
      <Link href={whoHref} className="link react-who">
        {t("whoReacted")}
      </Link>
    ) : null;

  if (own)
    return (
      <div className="reacts">
        <span className="react react-like is-own" role="img" aria-label={label}>
          <Wave />
          <span className="n">{state.count}</span>
        </span>
        {who}
      </div>
    );

  const toggle = () => {
    const next = !state.reacted;
    const before = state;
    // Optimistic: the button answers at once; a refusal puts it back and says why.
    setState({ reacted: next, count: Math.max(0, state.count + (next ? 1 : -1)) });
    if (next) {
      setPressing(true);
      window.setTimeout(() => setPressing(false), 400);
    }
    startTransition(async () => {
      const r = await reactAction(answerId, next);
      if (r.ok) setState({ reacted: r.reacted, count: r.count });
      else {
        setState(before);
        toast.show(t(`error.${r.reason}`));
      }
    });
  };

  return (
    <div className="reacts">
      <button
        type="button"
        className={`react react-like${pressing ? " pressing" : ""}`}
        aria-pressed={state.reacted}
        aria-label={state.reacted ? `${label}, ${t("reactionYou")}` : label}
        title={t("reaction")}
        onClick={toggle}
      >
        <Wave />
        <span className="n">{state.count}</span>
      </button>
      {who}
    </div>
  );
}
