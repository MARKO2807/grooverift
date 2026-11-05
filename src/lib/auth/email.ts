import { appendFileSync } from "node:fs";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";

// Account and security email (OQ-32: no social email in the alpha). Until A7 picks a provider,
// the "console" transport prints the message to the server log in development, and the "file"
// transport appends JSON lines to EMAIL_FILE so end-to-end tests can read the links. Production
// refuses both at start-up (src/lib/env.ts), so a deployed server can never drop security mail.
export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  const { EMAIL_TRANSPORT, EMAIL_FILE } = env();
  switch (EMAIL_TRANSPORT) {
    case "none":
      return;
    case "file":
      appendFileSync(EMAIL_FILE, JSON.stringify({ at: new Date().toISOString(), ...mail }) + "\n");
      return;
    case "console":
      console.log(`\n[mail] to: ${mail.to}\n[mail] subject: ${mail.subject}\n${mail.text}\n`);
      return;
  }
}

/** Fire-and-forget for auth callbacks (never await the send, to avoid timing attacks): a failure is
 *  audited instead of becoming an unhandled rejection that could take the process down. */
export function sendMailInBackground(mail: Mail, kind: string): void {
  void sendMail(mail).catch(async (error) => {
    console.error("[mail] send failed:", kind, error instanceof Error ? error.message : error);
    await audit({ actorType: "system", action: "mail.failed", metadata: { kind } });
  });
}
