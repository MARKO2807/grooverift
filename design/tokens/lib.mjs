// GrooveRift token helpers. Zero dependencies (Node >= 18).
// Flattens DTCG-style JSON, applies overrides, resolves {aliases}, converts to CSS
// and computes WCAG 2.x contrast ratios.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const here = dirname(fileURLToPath(import.meta.url));
export const readJson = name => JSON.parse(readFileSync(join(here, name), 'utf8'));

/** Flatten groups into Map(path -> { value, type, description, extensions }). $type is inherited. */
export function flatten(tree) {
  const out = new Map();
  const walk = (node, path, inheritedType) => {
    const type = node.$type ?? inheritedType;
    if ('$value' in node) {
      out.set(path.join('.'), { value: node.$value, type, description: node.$description, extensions: node.$extensions });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || typeof child !== 'object' || child === null) continue;
      walk(child, [...path, key], type);
    }
  };
  walk(tree, [], undefined);
  return out;
}

/** Return a copy of the token map with override values (path -> raw $value) applied. */
export function withOverrides(tokens, overrides = {}) {
  const copy = new Map([...tokens].map(([k, v]) => [k, { ...v }]));
  for (const [path, value] of Object.entries(overrides)) {
    if (!copy.has(path)) throw new Error(`Override for unknown token: ${path}`);
    copy.get(path).value = value;
  }
  return copy;
}

const ALIAS = /^\{([^}]+)\}$/;

/** Resolve aliases recursively (inside arrays and objects too). Detects cycles. */
export function resolve(tokens, value, seen = []) {
  if (typeof value === 'string') {
    const m = value.match(ALIAS);
    if (!m) return value;
    const target = m[1];
    if (seen.includes(target)) throw new Error(`Alias cycle: ${[...seen, target].join(' -> ')}`);
    if (!tokens.has(target)) throw new Error(`Unknown alias {${target}}`);
    return resolve(tokens, tokens.get(target).value, [...seen, target]);
  }
  if (Array.isArray(value)) return value.map(v => resolve(tokens, v, seen));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(tokens, v, seen)]));
  }
  return value;
}

export const resolveAll = tokens =>
  new Map([...tokens].map(([path, t]) => [path, { ...t, resolved: resolve(tokens, t.value, [path]) }]));

export const cssName = path => `--gr-${path.replace(/\./g, '-')}`;

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'BlinkMacSystemFont']);
const family = list => list.map(f => (GENERIC.has(f) ? f : `"${f}"`)).join(', ');

/** Convert one resolved token to [[cssName, cssValue], ...]. Typography yields two entries. */
export function toCss(path, type, v) {
  const name = cssName(path);
  switch (type) {
    case 'color': case 'dimension': case 'duration': return [[name, v]];
    case 'number': case 'fontWeight': return [[name, String(v)]];
    case 'fontFamily': return [[name, family(v)]];
    case 'cubicBezier': return [[name, `cubic-bezier(${v.join(', ')})`]];
    case 'gradient': return [[name, `linear-gradient(90deg, ${v.map(s => `${s.color} ${s.position * 100}%`).join(', ')})`]];
    case 'shadow': return [[name, `${v.offsetX} ${v.offsetY} ${v.blur} ${v.spread} ${v.color}`]];
    case 'typography': return [
      [name, `${v.fontWeight} ${v.fontSize}/${v.lineHeight} ${family(v.fontFamily)}`],
      [`${name}-letter-spacing`, v.letterSpacing],
    ];
    default: throw new Error(`No CSS conversion for type "${type}" (${path})`);
  }
}

// ---- WCAG 2.x contrast (sRGB relative luminance) ----
export function parseHex(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`Not a #RRGGBB(AA) color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function ratio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const lerp = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1 });

/** Sample a resolved gradient (sRGB interpolation, as CSS does for hex stops) at 11 points per segment. */
export function sampleGradient(stops) {
  const out = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = parseHex(stops[i].color), b = parseHex(stops[i + 1].color);
    for (let k = 0; k <= 10; k++) out.push(lerp(a, b, k / 10));
  }
  return out;
}
