// Headless Chrome screenshots of the refined prototype (design/prototypes/pulse).
// New headless Chrome on Windows enforces a minimum window width, so each query is rendered in an
// iframe of the exact phone size, side by side in one image.
// Usage: node design/prototypes/tools/pulse-shots.mjs <outDir outside the repo> <width> <height> [--ms=4000] <query1> [query2 ...]
// Example: node design/prototypes/tools/pulse-shots.mjs C:/tmp/shots 360 740 "at=visibility" "flow=drop&at=drop"
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(resolve(here, '../pulse/index.html')).href;
const args = process.argv.slice(2);
const ms = (args.find(a => a.startsWith('--ms=')) || '--ms=4000').slice(5);
const [out, w, h, ...queries] = args.filter(a => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const frames = queries.map(q => `<iframe src="${base}?${q}" width="${w}" height="${h}" style="border:0;margin-right:12px;background:#0B0D12"></iframe>`).join('');
const slug = queries.map(q => q.replace(/[^a-z0-9]+/gi, '-')).join('_').slice(0, 80) || 'start';
const harness = resolve(out, `h-${slug}.html`);
writeFileSync(harness, `<!doctype html><body style="margin:0;background:#333;display:flex">${frames}</body>`);
const file = resolve(out, `${slug}.png`);
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  `--window-size=${(+w + 12) * queries.length},${h}`, `--virtual-time-budget=${ms}`, `--screenshot=${file}`,
  'file:///' + harness.replace(/\\/g, '/')], { stdio: 'ignore' });
console.log(file);
