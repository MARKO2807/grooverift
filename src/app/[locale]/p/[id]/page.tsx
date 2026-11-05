import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** `/p/<id>` (POST-01, PUB-09) is a beta wave (B1). Every id answers "nije dostupno" with 404 (IA8, U-01). */
export default async function PostRoute() {
  notFound();
}
