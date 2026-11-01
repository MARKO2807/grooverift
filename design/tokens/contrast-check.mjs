// WCAG 2.x contrast check for every pair in contrast-pairs.json. Zero dependencies.
// Usage:
//   node design/tokens/contrast-check.mjs                 # base tokens
//   node design/tokens/contrast-check.mjs --all-options   # base + every TQ1 x TQ2 x TQ3 combination
//   node design/tokens/contrast-check.mjs --report design/tokens/contrast-report.md
// Exit code 1 if any pair fails.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { here, readJson, flatten, withOverrides, resolveAll, parseHex, ratio, sampleGradient } from './lib.mjs';

const args = process.argv.slice(2);
const allOptions = args.includes('--all-options');
const reportIdx = args.indexOf('--report');
const reportPath = reportIdx >= 0 ? args[reportIdx + 1] : null;

const tokens = flatten(readJson('tokens.json'));
const spec = readJson('contrast-pairs.json');

function expandPairs() {
  const list = [];
  for (const g of spec.groups) {
    const bgs = g.bg === '$surfaces' ? spec.surfaces : g.bg;
    const pairs = g.pairs ?? g.fg.flatMap(fg => bgs.map(bg => [fg, bg]));
    for (const [fg, bg] of pairs) list.push({ group: g.name, kind: g.kind, min: g.min, fg, bg });
  }
  return list;
}
const pairs = expandPairs();

function colorsOf(resolved, path) {
  const t = resolved.get(path);
  if (!t) throw new Error(`Unknown token in contrast-pairs.json: ${path}`);
  if (t.type === 'gradient') return sampleGradient(t.resolved);
  if (t.type !== 'color') throw new Error(`${path} is ${t.type}, not a color`);
  const c = parseHex(t.resolved);
  if (c.a < 1) throw new Error(`${path} has alpha; contrast pairs need opaque colors`);
  return [c];
}

function check(overrides) {
  const resolved = resolveAll(withOverrides(tokens, overrides));
  return pairs.map(p => {
    const fgs = colorsOf(resolved, p.fg), bgs = colorsOf(resolved, p.bg);
    let worst = Infinity;
    for (const f of fgs) for (const b of bgs) worst = Math.min(worst, ratio(f, b));
    const show = path => (resolved.get(path).type === 'gradient' ? 'gradient' : resolved.get(path).resolved);
    return { ...p, ratio: worst, pass: worst >= p.min, fgHex: show(p.fg), bgHex: show(p.bg) };
  });
}

// Scenarios
const scenarios = [{ name: 'base (tokens.json)', overrides: {} }];
if (allOptions && existsSync(join(here, 'options.json'))) {
  const o = readJson('options.json');
  for (const [k1, a] of Object.entries(o.tq1.options))
    for (const [k2, b] of Object.entries(o.tq2.options))
      for (const [k3, c] of Object.entries(o.tq3.options))
        scenarios.push({ name: `TQ1=${k1} TQ2=${k2} TQ3=${k3}`, overrides: { ...a.overrides, ...b.overrides, ...c.overrides } });
}

let failures = 0;
const md = [];
const date = new Date().toISOString().slice(0, 10);
md.push('# Contrast report', '', `_Generated ${date} by \`node design/tokens/contrast-check.mjs${allOptions ? ' --all-options' : ''}\`. Do not edit by hand._`, '');
md.push('Method: WCAG 2.x relative luminance (sRGB). Gradients are sampled at 11 points per segment in sRGB, and the worst sample counts. text = SC 1.4.3, minimum 4.5:1. non-text = SC 1.4.11, minimum 3:1.', '');

for (const s of scenarios) {
  const results = check(s.overrides);
  const failed = results.filter(r => !r.pass);
  const min = results.reduce((m, r) => Math.min(m, r.ratio / r.min), Infinity);
  failures += failed.length;
  console.log(`${failed.length ? 'FAIL' : 'PASS'}  ${s.name}: ${results.length} pairs, ${failed.length} failing, tightest margin x${min.toFixed(2)} of minimum`);
  for (const f of failed) console.log(`      ${f.fg} on ${f.bg}: ${f.ratio.toFixed(2)} < ${f.min}`);

  md.push(`## ${s.name}`, '', `${results.length} pairs, **${failed.length} failing**.`, '');
  if (s === scenarios[0]) {
    md.push('| Group | Foreground | Background | Ratio | Min | Result |', '|---|---|---|---|---|---|');
    for (const r of results) md.push(`| ${r.group} | \`${r.fg}\` ${r.fgHex} | \`${r.bg}\` ${r.bgHex} | ${r.ratio.toFixed(2)} | ${r.min} | ${r.pass ? 'pass' : '**FAIL**'} |`);
  } else {
    const tight = [...results].sort((a, b) => a.ratio / a.min - b.ratio / b.min).slice(0, 3);
    md.push('Tightest pairs:', '');
    for (const r of tight) md.push(`- \`${r.fg}\` on \`${r.bg}\`: ${r.ratio.toFixed(2)} (min ${r.min})${r.pass ? '' : ' **FAIL**'}`);
    for (const f of failed) md.push(`- FAIL: \`${f.fg}\` on \`${f.bg}\`: ${f.ratio.toFixed(2)}`);
  }
  md.push('');
}

console.log(failures ? `\n${failures} failing pair(s).` : `\nAll pairs pass in ${scenarios.length} scenario(s).`);
if (reportPath) { writeFileSync(reportPath, md.join('\n')); console.log(`Report written to ${reportPath}`); }
process.exit(failures ? 1 : 0);
