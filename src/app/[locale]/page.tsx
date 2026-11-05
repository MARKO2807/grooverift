import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/brand/wordmark";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-[40rem] flex-col gap-6 px-4 py-12"
    >
      <Wordmark />
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-fg-secondary">{t("lead")}</p>
    </main>
  );
}
