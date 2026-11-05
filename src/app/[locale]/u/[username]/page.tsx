import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/@<username>` (PROF-01, PUB-08) is rewritten here by src/proxy.ts. Profiles arrive in step 5.5; until then
 * every username answers "nije dostupno" with 404, which is also what an unknown, private (to visitors),
 * blocked or deleted profile will answer then (IA8, U-02, U-04).
 */
export default async function ProfileRoute() {
  notFound();
}
