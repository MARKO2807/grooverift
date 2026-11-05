// The brand name in text is set like the wordmark (D-050): lowercase "groove" in the primary text colour,
// "rift" in Coral. The colour is set explicitly so a surrounding link (Amber) cannot recolour "groove".
// The interim wordmark (D-083) is a text setting in Sora; the designed vector wordmark is X-04.
// `inline` keeps the surrounding text size (the brand name inside a sentence).
export function Wordmark({
  className = "",
  inline = false,
}: {
  className?: string;
  inline?: boolean;
}) {
  return (
    <span
      className={`font-heading font-bold tracking-heading text-fg ${inline ? "" : "text-xl"} ${className}`}
      translate="no"
    >
      groove<span className="text-coral">rift</span>
    </span>
  );
}
