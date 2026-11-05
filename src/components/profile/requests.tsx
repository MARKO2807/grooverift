"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IconCheck } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { PendingRequest } from "@/lib/data/graph";
import { acceptRequestAction, declineRequestAction } from "@/lib/profile/actions";
import { Avatar } from "./avatar";

/**
 * ACT-02 (J4, D-074 (5)): accept or decline each request. Accepting follows at once and says so in the row;
 * declining removes the row silently (the requester is not told and may ask again after seven days, E6).
 */
export function RequestsList({ initial }: { initial: PendingRequest[] }) {
  const t = useTranslations("profile.requests");
  const te = useTranslations("profile.error");
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [done, setDone] = useState<Record<string, "accepted">>({});
  const [live, setLive] = useState("");
  const [pending, startTransition] = useTransition();

  const act = (r: PendingRequest, kind: "accept" | "decline") =>
    startTransition(async () => {
      const res =
        kind === "accept"
          ? await acceptRequestAction(r.userId)
          : await declineRequestAction(r.userId);
      if (!res.ok) {
        toast.show(te(res.reason));
        return;
      }
      if (kind === "accept") {
        setDone((d) => ({ ...d, [r.userId]: "accepted" }));
        setLive(t("accepted", { name: r.displayName }));
      } else {
        setRows((list) => list.filter((x) => x.userId !== r.userId));
        setLive(t("declined"));
      }
    });

  return (
    <div className="form-stack">
      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>
      {rows.length ? (
        <ul className="fl-list req-list">
          {rows.map((r) => (
            <li key={r.userId} className="fl-row">
              <Link href={`/@${r.username}`} className="fl-person">
                <Avatar name={r.displayName} size="sm" />
                <span className="set-txt">
                  <span className="set-t">{r.displayName}</span>
                  <span className="set-d">@{r.username}</span>
                </span>
              </Link>
              {done[r.userId] ? (
                <span className="req-done">
                  <IconCheck />
                  <span>{t("accepted", { name: r.displayName })}</span>
                </span>
              ) : (
                <span className="act-btns">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    aria-disabled={pending || undefined}
                    onClick={() => !pending && act(r, "accept")}
                  >
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-disabled={pending || undefined}
                    onClick={() => !pending && act(r, "decline")}
                  >
                    {t("decline")}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-b">
          <p className="empty-t">{t("empty")}</p>
          <p>{t("emptyText")}</p>
        </div>
      )}
      <p className="set-note">{t("note")}</p>
    </div>
  );
}
