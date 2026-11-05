"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { IconCheck, IconClock, IconMutual, IconUserPlus } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import {
  followAction,
  unfollowAction,
  type ActionFailure,
  type RelationState,
} from "@/lib/profile/actions";

// The relationship button (PROF-01, J4, D-074 (1) and (2)): one button that names its state. Follow and Request
// act at once; Unfollow and Cancel request are separate, confirmed actions (never a hidden second tap). The
// mutual relationship shows as a chip by the name (profile-screen); the button stays "Following".

// i18n-keys: profile.error.signedOut profile.error.notAllowed profile.error.notAvailable profile.error.tooMany
// i18n-keys: profile.error.wait profile.error.generic

export function RelationshipButton({
  targetId,
  username,
  targetPrivate,
  initial,
  followedBy,
  size = "md",
  className = "",
}: {
  targetId: string;
  username: string;
  targetPrivate: boolean;
  initial: RelationState;
  /** They follow the viewer: an accepted follow from the viewer makes a Mutual (D-013). */
  followedBy: boolean;
  size?: "md" | "sm";
  className?: string;
}) {
  const t = useTranslations("profile");
  const toast = useToast();
  const router = useRouter();
  const [state, setState] = useState<RelationState>(initial);
  const [confirm, setConfirm] = useState<"unfollow" | "cancel" | null>(null);
  const [pending, startTransition] = useTransition();
  const sizeClass = size === "sm" ? " btn-sm fl-btn" : "";

  const fail = (reason: ActionFailure) => toast.show(t(`error.${reason}`));

  const follow = () =>
    startTransition(async () => {
      const r = await followAction(targetId);
      if (r.ok) {
        setState(r.state);
        toast.show(r.state === "pending" ? t("requestSent") : t("nowFollowing", { username }));
        router.refresh(); // counts and sections follow the new relationship
      } else {
        if (r.state) setState(r.state);
        fail(r.reason);
      }
    });

  const unfollow = (close: () => void) =>
    startTransition(async () => {
      const r = await unfollowAction(targetId);
      close();
      if (r.ok) {
        setState("none");
        toast.show(confirm === "cancel" ? t("requestCancelled") : t("unfollowed", { username }));
        router.refresh();
      } else fail(r.reason);
    });

  const mutual = state === "accepted" && followedBy;
  let button: React.ReactNode;
  if (state === "pending") {
    button = (
      <button
        type="button"
        className={`btn btn-secondary${sizeClass} ${className}`}
        aria-label={t("requestedLabel")}
        aria-disabled={pending || undefined}
        onClick={() => !pending && setConfirm("cancel")}
      >
        <IconClock />
        {t("requested")}
      </button>
    );
  } else if (state === "accepted") {
    button = (
      <button
        type="button"
        className={`btn btn-secondary${mutual ? " btn-mut" : ""}${sizeClass} ${className}`}
        aria-label={mutual ? t("mutualLabel") : t("followingLabel")}
        aria-disabled={pending || undefined}
        onClick={() => !pending && setConfirm("unfollow")}
      >
        {mutual ? <IconMutual /> : <IconCheck />}
        {t("following")}
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        className={`btn btn-primary${sizeClass} ${className}`}
        aria-disabled={pending || undefined}
        onClick={() => !pending && follow()}
      >
        <IconUserPlus />
        {targetPrivate ? t("request") : t("follow")}
      </button>
    );
  }

  return (
    <>
      {button}
      <Dialog
        title={
          confirm === "cancel" ? t("cancelTitle", { username }) : t("unfollowTitle", { username })
        }
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        {(close) => (
          <div className="form-stack">
            <p>
              {confirm === "cancel"
                ? t("cancelText")
                : targetPrivate
                  ? t("unfollowPrivate")
                  : t("unfollowPublic")}
            </p>
            <div className="foot-row">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                aria-disabled={pending || undefined}
                onClick={() => !pending && unfollow(close)}
              >
                {confirm === "cancel" ? t("cancelRequest") : t("unfollow")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
