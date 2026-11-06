// ZeptoMail (Zoho, EU data centre) over its HTTP API, with the built-in fetch: no SDK dependency (A7, D-110).
// Kept pure so the request shape is unit-tested without the network; `sendMail` in ./email.ts calls it.
import type { Mail } from "./email";

export type Address = { address: string; name?: string };

/** "GrooveRift <no-reply@grooverift.com>" → { name, address }; a bare address has no name. */
export function parseFrom(from: string): Address {
  const m = /^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/.exec(from);
  if (m) return m[1] ? { name: m[1].replace(/^"|"$/g, ""), address: m[2]! } : { address: m[2]! };
  return { address: from.trim() };
}

/** The console shows the token with or without its scheme; both work. */
export function authorization(token: string): string {
  const t = token.trim();
  return /^zoho-enczapikey\s/i.test(t) ? t : `Zoho-enczapikey ${t}`;
}

export function zeptoRequest(
  mail: Mail,
  opts: { apiUrl: string; token: string; from: string },
): { url: string; init: RequestInit } {
  const url = `${opts.apiUrl.replace(/\/+$/, "")}/v1.1/email`;
  const body = {
    from: parseFrom(opts.from),
    to: [{ email_address: { address: mail.to } }],
    subject: mail.subject,
    textbody: mail.text,
    // Open and click tracking stay off in the Mail Agent settings (runbook §3): one-time links must not be rewritten.
  };
  return {
    url,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization(opts.token),
      },
      body: JSON.stringify(body),
    },
  };
}

/** Sends one message; throws with the status and ZeptoMail's error code only (never the body, which can echo
 *  the recipient address). */
export async function sendZepto(
  mail: Mail,
  opts: { apiUrl: string; token: string; from: string },
): Promise<void> {
  const { url, init } = zeptoRequest(mail, opts);
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (res.ok) return;
  let code = "unknown";
  try {
    const json = (await res.json()) as {
      error?: { code?: string };
      data?: { error_code?: string };
    };
    code = json.error?.code ?? json.data?.error_code ?? code;
  } catch {
    // not JSON: keep "unknown"
  }
  throw new Error(`ZeptoMail answered ${res.status} (${code})`);
}
