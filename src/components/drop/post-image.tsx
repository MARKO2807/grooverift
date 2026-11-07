"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { PORTRAIT_CAP } from "@/lib/media/rules";
import type { PostImageData } from "@/lib/drop/rules";

// D-121 (2), (3): the whole image in its own aspect ratio, a portrait one shown at most 4:5 (the rest is seen in the
// viewer), with the member's description or "Slika koju je dodao/dodala <name>" as the text alternative. A tap opens
// the full image with "Zatvori" (Esc closes, focus returns). Width and height come with the data, so the page does
// not jump while the image loads. The bytes come from /api/media, which checks access again.

export function PostImage({ image, author }: { image: PostImageData; author: string }) {
  const t = useTranslations("drop.image");
  const [open, setOpen] = useState(false);
  const alt = image.alt ?? t("altFallback", { name: author });
  const ratio = Math.max(image.width / image.height, PORTRAIT_CAP);
  const src = `/api/media/${image.id}`;
  return (
    <>
      <button
        type="button"
        className="post-img"
        style={{ aspectRatio: String(ratio) }}
        aria-label={t("open", { alt })}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/media with its own authorization */}
        <img
          src={src}
          alt=""
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
      </button>
      <Dialog title={t("viewerTitle")} isOpen={open} onOpenChange={setOpen} wide>
        {(close) => (
          <div className="img-viewer">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/media */}
            <img src={src} alt={alt} width={image.width} height={image.height} />
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={close}>
                {t("close")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
