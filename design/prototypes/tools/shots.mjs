// Headless Chrome screenshots of the step 3.5 direction prototypes.
// New headless Chrome on Windows enforces a minimum window width, so each page is
// rendered inside an iframe of the exact phone width, three directions side by side.
// Usage: node design/prototypes/tools/shots.mjs <outDir outside the repo> <phoneWidth> <height> <query1> [query2 ...]
// Example query: "flow=drop&at=drop&private=1&open=compose"
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as rpath } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(rpath(here, '../directions')).href;
const [out, w, h, ...queries] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
for (const q of queries) {
  const slug = q.replace(/[^a-z0-9]+/gi, '-') || 'start';
  const frames = ['a-quiet', 'b-cards', 'c-pulse'].map(d =>
    `<iframe src="${base}/${d}/index.html?${q}" width="${w}" height="${h}" style="border:0;margin-right:12px;background:#0B0D12"></iframe>`).join('');
  const harness = resolve(out, `h-${slug}.html`);
  writeFileSync(harness, `<!doctype html><body style="margin:0;background:#333;display:flex">${frames}</body>`);
  const file = resolve(out, `${slug}.png`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=${w * 3 + 36},${h}`, '--virtual-time-budget=4000', `--screenshot=${file}`,
    'file:///' + harness.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log(file);
}
