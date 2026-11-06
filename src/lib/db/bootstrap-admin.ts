import "@/lib/load-env";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { createInvitation, normalizeEmail } from "@/lib/data/invitations";
import { env } from "@/lib/env";
import { inviteLink } from "@/lib/onboarding/invite-mail";
import { closeDb, db } from "./client";
import { user } from "./schema";

// First admin on a fresh environment (staging, A7). Sign-up is by invitation only (D-097) and invitations are
// created by an admin, so the very first account needs this one-off path, run by the owner in the Render shell:
//   npm run admin:bootstrap -- invite <email>    prints the invitation link (never emailed, never stored)
//   npm run admin:bootstrap -- promote <email>   after sign-up: gives that account the admin role
// Both refuse as soon as any admin exists; from then on admins invite and assign roles in the app.

async function adminExists(): Promise<boolean> {
  const [row] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);
  return !!row;
}

async function main(): Promise<number> {
  const [command, rawEmail] = process.argv.slice(2);
  if (!rawEmail || (command !== "invite" && command !== "promote")) {
    console.error("Usage: npm run admin:bootstrap -- invite|promote <email>");
    return 2;
  }
  if (await adminExists()) {
    console.error("An admin already exists: invite and assign roles in the app instead.");
    return 1;
  }
  const email = normalizeEmail(rawEmail);

  if (command === "invite") {
    const r = await createInvitation({ email, invitedBy: null, locale: "hr" });
    if (!r.ok) {
      console.error(`Invitation refused: ${r.reason}.`);
      return 1;
    }
    await audit({
      actorType: "system",
      action: "admin.bootstrap.invite",
      targetType: "invitation",
      targetId: r.id,
    });
    console.log(`Invitation link (valid until ${r.expiresAt.toISOString()}):`);
    console.log(inviteLink(env().APP_URL, "hr", r.token));
    return 0;
  }

  const [member] = await db()
    .select({ id: user.id, verified: user.emailVerified })
    .from(user)
    .where(eq(user.email, email));
  if (!member) {
    console.error("No account with that address: open the invitation link and sign up first.");
    return 1;
  }
  if (!member.verified) {
    console.error("The address is not verified yet.");
    return 1;
  }
  await db().update(user).set({ role: "admin" }).where(eq(user.id, member.id));
  await audit({
    actorType: "system",
    action: "admin.bootstrap.promote",
    targetType: "user",
    targetId: member.id,
  });
  console.log("Done: the account is now an admin. Enable two-factor before opening /admin.");
  return 0;
}

main()
  .then(async (code) => {
    await closeDb();
    process.exit(code);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await closeDb();
    process.exit(1);
  });
