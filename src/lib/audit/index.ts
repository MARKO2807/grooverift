import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type AuditEvent = {
  actorType: "member" | "staff" | "system";
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

const REDACT_KEYS = /pass|secret|token|code|otp|cookie|authorization|email|body|text|message/i;

/** Drops keys that look like credentials or content; values are never logged in full. */
export function redact(meta: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.test(k)) out[k] = "[redacted]";
    else if (typeof v === "string") out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (v && typeof v === "object" && !Array.isArray(v))
      out[k] = redact(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

/** A keyed hash of the IP: enough to correlate events, not enough to recover the address. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${env().BETTER_AUTH_SECRET}:ip:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Appends one audit entry. Never throws: an audit failure must not break the request, but it is logged. */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    await db()
      .insert(auditLog)
      .values({
        actorType: event.actorType,
        actorId: event.actorId ?? null,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        ipHash: hashIp(event.ip),
        userAgent: event.userAgent ? event.userAgent.slice(0, 256) : null,
        metadata: redact(event.metadata),
      });
  } catch (error) {
    console.error(
      "[audit] failed to write",
      event.action,
      error instanceof Error ? error.message : error,
    );
  }
}
