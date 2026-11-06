import "server-only";
import { latestExport } from "@/lib/data/export";
import { exportDownloadPath } from "./download";

/** What the copy step and the grace-period screen show about the member's data copy. */
export type ExportView = {
  status: "none" | "requested" | "building" | "ready" | "failed";
  href?: string;
  expiresAt?: string;
  sizeBytes?: number;
};

export async function exportViewFor(userId: string): Promise<ExportView> {
  const latest = await latestExport(userId);
  if (!latest) return { status: "none" };
  if (latest.status === "ready" && latest.expiresAt)
    return {
      status: "ready",
      href: exportDownloadPath(latest.id, userId, latest.expiresAt),
      expiresAt: latest.expiresAt.toISOString(),
      sizeBytes: latest.sizeBytes ?? undefined,
    };
  if (latest.status === "expired") return { status: "none" };
  return { status: latest.status };
}
