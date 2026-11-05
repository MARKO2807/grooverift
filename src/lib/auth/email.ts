import { appendFileSync } from "node:fs";
import { env } from "@/lib/env";

// Account and security email (OQ-32: no social email in the alpha). Until A7 picks a provider,
// the "console" transport prints the message to the server log in development, and the "file"
// transport appends JSON lines to EMAIL_FILE so end-to-end tests can read the links.
export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  const { EMAIL_TRANSPORT, EMAIL_FILE, NODE_ENV } = env();
  if (EMAIL_TRANSPORT === "none") return;
  if (NODE_ENV === "production") {
    // A7 not approved yet: refuse loudly rather than silently losing security email.
    throw new Error("No email transport is configured for production (A7).");
  }
  if (EMAIL_TRANSPORT === "file") {
    appendFileSync(EMAIL_FILE, JSON.stringify({ at: new Date().toISOString(), ...mail }) + "\n");
    return;
  }
  console.log(`\n[mail] to: ${mail.to}\n[mail] subject: ${mail.subject}\n${mail.text}\n`);
}
