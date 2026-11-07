import { NextResponse, type NextRequest } from "next/server";
import { getSession, roleOf } from "@/lib/auth/session";
import { loadViewer } from "@/lib/data/facts";
import { imageForViewer } from "@/lib/data/media";

// Every stored image is served here (step 5.11, D-121: "served through an authorization check"). The policy is
// asked about the image's parent on each request; every refusal is the same 404, so the URL tells nothing about
// whether an image exists. Member images are cached only by the viewer's own browser, for a short time; artist
// photos are public. The bytes are always re-encoded WebP (src/lib/media/process.ts), never what was uploaded.

export const dynamic = "force-dynamic";

const BASE = {
  "X-Content-Type-Options": "nosniff",
  // An image never runs anything, even if opened on its own.
  "Content-Security-Policy":
    "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const notFound = () =>
  new NextResponse("Not found", {
    status: 404,
    headers: { ...BASE, "Cache-Control": "private, no-store" },
  });

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  const viewer = await loadViewer(session ? { id: session.user.id, role: roleOf(session) } : null);
  const caseId = request.nextUrl.searchParams.get("case") ?? undefined;
  const image = await imageForViewer(viewer, id, { caseId });
  if (!image) return notFound();
  return new NextResponse(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      ...BASE,
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.length),
      "Content-Disposition": "inline",
      // Ids never change content (a new photo is a new id); private images still expire soon so a block, a hidden
      // account or a removal reaches the viewer's own cache quickly.
      "Cache-Control":
        image.cache === "public"
          ? "public, max-age=3600" // review 5.11 L3: a hidden photo leaves browser caches within the hour
          : "private, max-age=300",
      Vary: "Cookie",
    },
  });
}
