import { notFound } from "next/navigation";
import { PublicShell } from "@/components/shell/public-shell";
import { Spirala } from "@/components/motifs/spirala";
import { FeaturePaused } from "@/components/system/states";

export const dynamic = "force-dynamic";

/** Development and e2e only (404 in production unless E2E_SPECIMENS=1): the Spirala with FICTIONAL picks, for
 *  the screenshot pass, axe and the frame-time measurement. Not linked from anywhere. */
export default async function SpecimenPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_SPECIMENS !== "1") notFound();
  return (
    <PublicShell screen="specimen" legal={false}>
      <h1 tabIndex={-1}>Specimen (izmišljeni podaci)</h1>
      <Spirala
        caption="Music DNA: primjer"
        genres={["Metal", "Jazz", "Elektronika", "Kantautorska", "Rap"]}
        artists={[
          { name: "Izvođač A", genres: ["Metal"] },
          { name: "Izvođač B", genres: ["Jazz"] },
          { name: "Izvođač C", genres: ["Elektronika"] },
        ]}
      />
      <Spirala caption="Music DNA: prazan" genres={[]} height={120} />
      <FeaturePaused feature="music_dna" />
    </PublicShell>
  );
}
