import { redirect } from "@/i18n/navigation";
import { latestPublishedDate } from "@/lib/data/drops";

export const dynamic = "force-dynamic";

/**
 * `/drop` without a date (a shortened link, a typed address): the newest published question, or the Hub when
 * none is published yet (its countdown explains the wait). Never a scheduled or future date (U-03).
 */
export default async function DropIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const date = await latestPublishedDate();
  redirect({ href: date ? `/drop/${date}` : "/hub", locale });
}
