"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { pollDropAction } from "@/lib/drop/actions";
import { POLL_MS } from "@/lib/drop/rules";

// J3 E3 and E1 on an open question page. Once a minute (only while the tab is visible) the page asks how many
// answers the viewer can see and which question is the newest. New answers show as a button above the list;
// nothing is inserted above the reading position (WCAG 2.2.2). A newer Daily Drop shows as a banner with a link;
// the question on screen never changes under the reader (WCAG 3.2.2). The polite live region says each once.

export function NewAnswers({
  questionId,
  date,
  count,
}: {
  questionId: string;
  date: string;
  count: number;
}) {
  const t = useTranslations("drop");
  const router = useRouter();
  const [fresh, setFresh] = useState(0);
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await pollDropAction(questionId);
      if (stop || !r.ok) return;
      setFresh(Math.max(0, r.count - count));
      if (r.latest && r.latest > date) setLatest(r.latest);
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [questionId, date, count]);

  return (
    <>
      {latest ? (
        <p className="dd-late new-drop">
          <span>{t("newDropOut")}</span>
          <Link href={`/drop/${latest}`} className="link">
            {t("openNewDrop")}
          </Link>
        </p>
      ) : null}
      {fresh > 0 ? (
        <button
          type="button"
          className="new-pill"
          onClick={() => {
            setFresh(0);
            router.refresh();
          }}
        >
          {t("newAnswers", { count: fresh })}
        </button>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {fresh > 0 ? t("newAnswersSr", { count: fresh }) : ""}
        {latest ? ` ${t("newDropOut")}` : ""}
      </p>
    </>
  );
}
