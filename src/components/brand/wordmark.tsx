// The brand name in text is set like the wordmark (D-050): "Groove" plain, "rift" in Coral.
// The interim wordmark (D-083) is a text setting in Sora; the designed vector wordmark is X-04.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-heading text-xl font-bold tracking-heading ${className}`} translate="no">
      Groove<span className="text-coral">rift</span>
    </span>
  );
}
