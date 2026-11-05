// The brand name in text is set like the wordmark (D-050): lowercase "groove" in the primary text colour,
// "rift" in Coral. The colour is set explicitly so a surrounding link (Amber) cannot recolour "groove".
// The interim wordmark (D-083) is a text setting in Sora; the designed vector wordmark is X-04.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading text-xl font-bold tracking-heading text-fg ${className}`}
      translate="no"
    >
      groove<span className="text-coral">rift</span>
    </span>
  );
}
