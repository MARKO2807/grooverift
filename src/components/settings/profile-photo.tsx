"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/profile/avatar";
import { Dialog } from "@/components/ui/dialog";
import {
  IconBack,
  IconCamera,
  IconCaretDown,
  IconCaretUp,
  IconChevron,
  IconImage,
  IconTrash,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { removeProfilePhotoAction, uploadProfilePhotoAction } from "@/lib/media/actions";
import { ACCEPT, MAX_UPLOAD_BYTES } from "@/lib/media/rules";

// PROF-08 photo (D-078 (3) A, (4) A; round 12d): "Dodaj sliku" / "Promijeni sliku" opens a sheet with gallery,
// camera and remove; after a choice, "Namjesti sliku" shows the circle with zoom, and the picture moves by dragging,
// by the four buttons or by the arrow keys. Only the square inside the circle is kept; the server re-encodes it and
// strips EXIF and GPS. Nothing is uploaded until "Spremi".

// i18n-keys: media.error.signedOut media.error.notAllowed media.error.tooMany media.error.tooLarge
// i18n-keys: media.error.format media.error.decode media.error.empty media.error.generic media.error.busy

const VIEW = 220; // the circle's size in CSS pixels (kept in step with .crop-circ)
const ZOOM_MAX = 2.5;
const STEP = 12; // pixels per button press or arrow key

type Draft = { url: string; file: File; w: number; h: number };
type View = { zoom: number; ox: number; oy: number };

function clamp(v: View, d: Draft): View {
  const s = (VIEW / Math.min(d.w, d.h)) * v.zoom;
  const W = d.w * s;
  const H = d.h * s;
  return {
    zoom: v.zoom,
    ox: Math.min(0, Math.max(VIEW - W, v.ox)),
    oy: Math.min(0, Math.max(VIEW - H, v.oy)),
  };
}

function centred(d: Draft, zoom = 1): View {
  const s = (VIEW / Math.min(d.w, d.h)) * zoom;
  return { zoom, ox: (VIEW - d.w * s) / 2, oy: (VIEW - d.h * s) / 2 };
}

/** The square inside the circle as fractions of the picture (what the server's parseCrop expects). */
function cropOf(v: View, d: Draft): string {
  const s = (VIEW / Math.min(d.w, d.h)) * v.zoom;
  const x = Math.max(0, -v.ox / s / d.w);
  const y = Math.max(0, -v.oy / s / d.h);
  const size = Math.min(1, 1 / v.zoom);
  return [x, y, size].map((n) => n.toFixed(5)).join(",");
}

export function ProfilePhoto({ name, photoId }: { name: string; photoId: string | null }) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => () => (draft ? URL.revokeObjectURL(draft.url) : undefined), [draft]);

  const pick = (input: React.RefObject<HTMLInputElement | null>) => {
    setSheet(false);
    input.current?.click();
  };

  const chosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return toast.show(t("error.tooLarge"));
    if (!ACCEPT.split(",").includes(file.type)) return toast.show(t("error.format"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const d = { url, file, w: img.naturalWidth, h: img.naturalHeight };
      setDraft(d);
      setView(centred(d));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.show(t("error.decode"));
    };
    img.src = url;
  };

  const move = useCallback(
    (dx: number, dy: number) =>
      setView((v) => (draft ? clamp({ ...v, ox: v.ox + dx, oy: v.oy + dy }, draft) : v)),
    [draft],
  );

  const zoomTo = (zoom: number) =>
    setView((v) => {
      if (!draft) return v;
      // Keep the point in the middle of the circle where it is.
      const ratio = zoom / v.zoom;
      const c = VIEW / 2;
      return clamp({ zoom, ox: c - (c - v.ox) * ratio, oy: c - (c - v.oy) * ratio }, draft);
    });

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, [number, number]> = {
      ArrowLeft: [STEP, 0],
      ArrowRight: [-STEP, 0],
      ArrowUp: [0, STEP],
      ArrowDown: [0, -STEP],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    move(d[0], d[1]);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", draft.file);
    form.set("crop", cropOf(view, draft));
    const r = await uploadProfilePhotoAction(form);
    setBusy(false);
    if (!r.ok) return toast.show(t(`error.${r.reason}`));
    setDraft(null);
    toast.show(t("photoSaved"));
    router.refresh();
  };

  const remove = async () => {
    setSheet(false);
    setBusy(true);
    const r = await removeProfilePhotoAction();
    setBusy(false);
    if (!r.ok) return toast.show(t(`error.${r.reason}`));
    toast.show(t("photoRemoved"));
    router.refresh();
  };

  const s = draft ? (VIEW / Math.min(draft.w, draft.h)) * view.zoom : 1;

  return (
    <div className="photo-row">
      <Avatar name={name} photo={photoId} size="lg" />
      <div className="photo-row-txt">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-haspopup="dialog"
          onClick={() => setSheet(true)}
          disabled={busy}
        >
          <IconCamera />
          {photoId ? t("change") : t("add")}
        </button>
        <p className="hint">{t("profileHint")}</p>
      </div>
      <input ref={gallery} type="file" accept={ACCEPT} hidden onChange={chosen} />
      <input ref={camera} type="file" accept={ACCEPT} capture="user" hidden onChange={chosen} />

      <Dialog title={t("sheetTitle")} isOpen={sheet} onOpenChange={setSheet}>
        <div className="menu">
          <button type="button" className="menu-item" onClick={() => pick(gallery)}>
            <IconImage />
            {t("gallery")}
          </button>
          <button type="button" className="menu-item" onClick={() => pick(camera)}>
            <IconCamera />
            {t("camera")}
          </button>
          {photoId ? (
            <button type="button" className="menu-item" onClick={remove}>
              <IconTrash />
              {t("remove")}
            </button>
          ) : null}
        </div>
        <p className="meta">{t("formats")}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setSheet(false)}>
            {t("close")}
          </button>
        </div>
      </Dialog>

      <Dialog
        title={t("cropTitle")}
        isOpen={!!draft}
        onOpenChange={(o) => (o ? undefined : setDraft(null))}
      >
        {draft ? (
          <>
            <div className="crop-wrap">
              {/* The circle is a pan surface: dragging, and the arrow keys once focused; the four buttons below do the
                  same for anyone who can use neither. */}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <div
                className="crop-circ"
                role="group"
                tabIndex={0}
                aria-label={t("cropArea")}
                aria-describedby="crop-help"
                onKeyDown={onKey}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
                }}
                onPointerMove={(e) => {
                  const g = drag.current;
                  if (!g) return;
                  setView((v) =>
                    clamp({ ...v, ox: g.ox + e.clientX - g.x, oy: g.oy + e.clientY - g.y }, draft),
                  );
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview, never optimised */}
                <img
                  className="crop-img"
                  src={draft.url}
                  alt=""
                  draggable={false}
                  style={{
                    width: draft.w * s,
                    height: draft.h * s,
                    transform: `translate(${view.ox}px, ${view.oy}px)`,
                  }}
                />
              </div>
            </div>
            <div className="crop-moves" role="group" aria-label={t("moveGroup")}>
              <button
                type="button"
                className="iconbtn"
                aria-label={t("moveLeft")}
                onClick={() => move(STEP, 0)}
              >
                <IconBack />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={t("moveUp")}
                onClick={() => move(0, STEP)}
              >
                <IconCaretUp />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={t("moveDown")}
                onClick={() => move(0, -STEP)}
              >
                <IconCaretDown />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label={t("moveRight")}
                onClick={() => move(-STEP, 0)}
              >
                <IconChevron />
              </button>
            </div>
            <div className="field">
              <label className="label" htmlFor="f-zoom">
                {t("zoom")}
              </label>
              <input
                type="range"
                className="range"
                id="f-zoom"
                min={1}
                max={ZOOM_MAX}
                step={0.05}
                value={view.zoom}
                onChange={(e) => zoomTo(Number(e.target.value))}
              />
            </div>
            <p className="hint" id="crop-help">
              {t("cropHelp")}
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? t("saving") : t("save")}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
