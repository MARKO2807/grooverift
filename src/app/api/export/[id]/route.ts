import { NextResponse, type NextRequest } from "next/server";
import { verifyExportSignature } from "@/lib/account/download";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { exportArchive } from "@/lib/data/export";
import { consume } from "@/lib/data/rate-limit";

// The data copy download (step 5.10, D-066). Only the owner, signed in, with an unexpired signed link, gets the
// bytes; everything else answers the same 404 (no hint whether the copy exists). Never cached anywhere.

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

const notFound = () => new NextResponse("Not found", { status: 404, headers: NO_STORE });

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();
  const session = await getSession();
  if (!session) return notFound();
  const userId = session.user.id;
  const q = request.nextUrl.searchParams;
  if (!verifyExportSignature(id, userId, q.get("e"), q.get("s"))) return notFound();
  if (!(await consume("exportDownload", userId)).allowed)
    return new NextResponse("Too many requests", { status: 429, headers: NO_STORE });
  const copy = await exportArchive(userId, id);
  if (!copy) return notFound();
  await audit({
    actorType: "member",
    actorId: userId,
    action: "account.export.downloaded",
    targetType: "data_export_request",
    targetId: id,
  });
  const day = copy.createdAt.toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(copy.archive), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/zip",
      "Content-Length": String(copy.archive.length),
      "Content-Disposition": `attachment; filename="grooverift-data-${day}.zip"`,
    },
  });
}
