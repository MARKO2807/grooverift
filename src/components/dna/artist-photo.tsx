"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { IconInfo } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { setArtistPhotoHiddenAction } from "@/lib/media/actions";
import { isOldCc, isShareAlike } from "@/lib/media/rules";
import { ArtistTile } from "./artist-tile";

// CAT-01 header photo (D-118 (1), (2), (5)) with the "O fotografiji" sheet. The credit follows the research's build
// list (docs/legal/research/E-copyright-music-trademarks.md): who to credit, the title, the licence with version and
// port, Wikimedia Commons, the note that we cropped and resized it, the adaptation credit for CC 2.x/3.0, the
// same-licence line for BY-SA, any credit line, and "Prijavi problem" (PUB-11 with the artist filled in). Admins also
// get "Sakrij fotografiju" with a reason, or "Vrati fotografiju" when hidden. All text is plain; links go only to
// Commons and Creative Commons (checked when the photo was stored).

// i18n-keys: artist.photo.error.notAllowed artist.photo.error.invalid artist.photo.error.tooMany
// i18n-keys: artist.photo.error.generic

export type PhotoCredit = {
  mediaId: string;
  by: string | null;
  title: string | null;
  creditLine: string | null;
  licence: string;
  licenceUrl: string | null;
  filePageUrl: string;
};

export function ArtistPhoto({
  artistId,
  name,
  photo,
  admin,
}: {
  artistId: string;
  name: string;
  photo: PhotoCredit | null;
  /** Present for admins only. */
  admin?: { hidden: boolean; reason: string | null; hasPhoto: boolean } | null;
}) {
  const t = useTranslations("artist.photo");
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const setHidden = async (hidden: boolean) => {
    setBusy(true);
    const r = await setArtistPhotoHiddenAction(artistId, hidden, reason);
    setBusy(false);
    if (!r.ok) return toast.show(t(`error.${r.reason}`));
    setHiding(false);
    setOpen(false);
    toast.show(hidden ? t("hidden") : t("shown"));
    router.refresh();
  };

  const licenceName =
    photo?.licence === "Public domain" ? t("publicDomain") : (photo?.licence ?? "");

  return (
    <div className="art-photo">
      <ArtistTile name={name} size="xl" photo={photo?.mediaId ?? null} />
      {photo ? (
        <button
          type="button"
          className="iconbtn art-info"
          aria-label={t("about")}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <IconInfo />
        </button>
      ) : null}
      {photo ? (
        <Dialog title={t("about")} isOpen={open} onOpenChange={setOpen}>
          <dl className="credit-list">
            {photo.by ? (
              <>
                <dt>{t("author")}</dt>
                <dd>
                  <a
                    className="link"
                    href={photo.filePageUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {photo.by}
                    <span className="sr-only"> {t("newTab")}</span>
                  </a>
                </dd>
              </>
            ) : null}
            {photo.title ? (
              <>
                <dt>{t("title")}</dt>
                <dd>{photo.title}</dd>
              </>
            ) : null}
            <dt>{t("licence")}</dt>
            <dd>
              {photo.licenceUrl ? (
                <a
                  className="link"
                  href={photo.licenceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {licenceName}
                  <span className="sr-only"> {t("newTab")}</span>
                </a>
              ) : (
                licenceName
              )}
            </dd>
            <dt>{t("source")}</dt>
            <dd>
              <a
                className="link"
                href={photo.filePageUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Wikimedia Commons
                <span className="sr-only"> {t("newTab")}</span>
              </a>
            </dd>
            {photo.creditLine && photo.creditLine !== photo.by ? (
              <>
                <dt>{t("credit")}</dt>
                <dd>{photo.creditLine}</dd>
              </>
            ) : null}
          </dl>
          <p className="meta">{t("modified")}</p>
          {isOldCc(photo.licence) && photo.by ? (
            <p className="meta">{t("adaptation", { author: photo.by })}</p>
          ) : null}
          {isShareAlike(photo.licence) ? (
            <p className="meta">{t("shareAlike", { licence: photo.licence })}</p>
          ) : null}
          <p>
            <Link className="link" href={`/legal/notice?photo=${artistId}`}>
              {t("report")}
            </Link>
          </p>
          {admin?.hasPhoto && !admin.hidden ? (
            hiding ? (
              <div className="field">
                <label className="label" htmlFor="hide-reason">
                  {t("hideReason")}
                </label>
                <textarea
                  id="hide-reason"
                  className="textarea"
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setHiding(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy || !reason.trim()}
                    onClick={() => setHidden(true)}
                  >
                    {t("hide")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setHiding(true)}>
                {t("hide")}
              </button>
            )
          ) : null}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              {t("close")}
            </button>
          </div>
        </Dialog>
      ) : null}
      {admin?.hidden ? (
        <div className="art-admin">
          <p className="meta">{t("hiddenNote", { reason: admin.reason ?? "" })}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => setHidden(false)}
          >
            {t("show")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
