import { appendFileSync } from "node:fs";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { sendZepto } from "./zeptomail";

// Account and security email (OQ-32: no social email in the alpha). Production sends through ZeptoMail (A7, D-110);
// the "console" transport prints the message to the server log in development, and the "file" transport appends
// JSON lines to EMAIL_FILE so end-to-end tests can read the links. Production refuses console and file at start-up
// (src/lib/env.ts); "none" exists only for a first deploy before the provider is set.
export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  const { EMAIL_TRANSPORT, EMAIL_FILE, EMAIL_FROM, ZEPTOMAIL_API_URL, ZEPTOMAIL_TOKEN } = env();
  switch (EMAIL_TRANSPORT) {
    case "zeptomail":
      return sendZepto(mail, {
        apiUrl: ZEPTOMAIL_API_URL!,
        token: ZEPTOMAIL_TOKEN!,
        from: EMAIL_FROM,
      });
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
