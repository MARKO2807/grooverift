import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { adminPageGate } from "@/components/admin/gate";
import { EditorialNav } from "@/components/admin/editorial-parts";
import { QuestionEditor } from "@/components/admin/editorial";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.editorial.editor");
  return { title: t("newTitle") };
}

/** ADM-05: a new Daily Drop question, written in HR or EN first (J6). */
export default async function NewQuestionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = await adminPageGate(locale, "/admin/editorial/drops/new", "editor", "admin");
  if (!gate.ok) return gate.element;
  const t = await getTranslations("admin.editorial.editor");
  return (
    <section className="form-stack">
      <h2 className="set-t">{t("newTitle")}</h2>
      <EditorialNav current="new" />
      <p className="meta">{t("newLead")}</p>
      <QuestionEditor mode="create" />
    </section>
  );
}
