import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/drop/<date>` (HUB-02, PUB-07) arrives in step 5.7. Until then every date answers "nije dostupno" with 404;
 * scheduled, reserve, failed and future questions will keep answering exactly that (U-03).
 */
export default async function DropRoute() {
  notFound();
}
