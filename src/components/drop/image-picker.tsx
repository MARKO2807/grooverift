"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { IconImage, IconTrash } from "@/components/ui/icons";
import type { PostImageData } from "@/lib/drop/rules";
import { ACCEPT, ALT_MAX, MAX_UPLOAD_BYTES } from "@/lib/media/rules";

// D-121: one image per answer or comment, with the optional "Opis slike". The file never leaves the browser until
// the post is sent; the preview is a local blob. Editing an answer shows the stored image with Remove and Replace.
// The size and type are checked here for a quick message; the server checks again and re-encodes.

export type PickedImage =
  | { kind: "new"; file: File; url: string; alt: string }
  | { kind: "kept"; image: PostImageData; alt: string };

/** What the action receives: the new file, a removal of the kept one, or a changed description. */
export function imageForm(
  picked: PickedImage | null,
  had: PostImageData | null,
): FormData | undefined {
  const f = new FormData();
  if (picked?.kind === "new") {
    f.set("image", picked.file);
    f.set("alt", picked.alt);
    return f;
  }
  if (!picked && had) {
    f.set("removeImage", "1");
    return f;
  }
  if (picked?.kind === "kept" && picked.alt !== (had?.alt ?? "")) {
    f.set("alt", picked.alt);
    return f;
  }
  return undefined;
}

export function ImagePicker({
  value,
  onChange,
  onProblem,
}: {
  value: PickedImage | null;
  onChange: (next: PickedImage | null) => void;
  /** "imageTooLarge" or "imageFormat", shown by the form's own error line. */
  onProblem: (reason: "imageTooLarge" | "imageFormat") => void;
}) {
  const t = useTranslations("drop.image");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const url = value?.kind === "new" ? value.url : null;
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return onProblem("imageTooLarge");
    if (!ACCEPT.split(",").includes(file.type)) return onProblem("imageFormat");
    onChange({ kind: "new", file, url: URL.createObjectURL(file), alt: "" });
  };

  return (
    <div className="img-pick">
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={choose} />
      {value ? (
        <>
          <div className="img-pick-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview or the stored image */}
            <img
              className="img-pick-thumb"
              src={value.kind === "new" ? value.url : `/api/media/${value.image.id}`}
              alt={t("preview")}
            />
            <div className="img-pick-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => input.current?.click()}
              >
                <IconImage />
                {t("replace")}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onChange(null)}
              >
                <IconTrash />
                {t("remove")}
              </button>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-alt`}>
              {t("altLabel")}
            </label>
            <p className="help" id={`${id}-alt-help`}>
              {t("altHelp")}
            </p>
            <input
              id={`${id}-alt`}
              className="input"
              maxLength={ALT_MAX}
              value={value.alt}
              aria-describedby={`${id}-alt-help`}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-sm img-pick-add"
          onClick={() => input.current?.click()}
        >
          <IconImage />
          {t("add")}
        </button>
      )}
    </div>
  );
}
