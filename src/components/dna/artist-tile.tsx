// The generated artist tile (owner, session 9; prototype catalog.js `tile`): one initial on a gradient from Coral to
// Amber picked by the name, for every artist (no photos in the alpha). Decorative: the name is always written next
// to it.

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export function tileFor(name: string) {
  const h = hash(name);
  const words = name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  const initial = ([...(words[0] ?? "?")][0] ?? "?").toUpperCase();
  const w = (h % 1000) / 1000;
  const angle = (h >> 10) % 360;
  const g = Math.round(88 + (203 - 88) * w);
  const b = Math.round(107 + (105 - 107) * w);
  return {
    initial,
    background: `linear-gradient(${angle}deg, rgb(255,${g},${b}) 0%, #2A2F3B 72%, #12151C 100%)`,
  };
}

export function ArtistTile({ name, size }: { name: string; size?: "lg" | "sm" }) {
  const t = tileFor(name);
  return (
    <span
      className={`art${size ? ` ${size}` : ""}`}
      style={{ background: t.background }}
      aria-hidden="true"
    >
      {t.initial}
    </span>
  );
}
