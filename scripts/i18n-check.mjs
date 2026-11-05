// Message completeness check (step 4.7): every locale has the same keys, no empty values,
// every key used in src/ exists, and every key in the catalogue is used somewhere.
// Dynamic keys: declare them in a comment, e.g.  // i18n-keys: errors.notFound errors.gone
// Usage: node scripts/i18n-check.mjs   (exit 1 on findings)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "messages");
const srcDir = join(root, "src");

const leafKeys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? leafKeys(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );

const locales = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(messagesDir, f), "utf8"))]);

const findings = [];
const [, base] = locales.find(([l]) => l === "hr") ?? locales[0];
const baseKeys = new Set(leafKeys(base).map(([k]) => k));

for (const [locale, messages] of locales) {
  const keys = new Map(leafKeys(messages));
  for (const [k, v] of keys) {
    if (typeof v !== "string") findings.push(`${locale}: "${k}" is not a string`);
    else if (!v.trim()) findings.push(`${locale}: "${k}" is empty`);
    if (!baseKeys.has(k)) findings.push(`${locale}: "${k}" has no Croatian counterpart`);
  }
  for (const k of baseKeys) if (!keys.has(k)) findings.push(`${locale}: missing "${k}"`);
}

// ---- Usage in src/ ----
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p);
  }
};
walk(srcDir);

const used = new Set();
const NS_RE =
  /(?:useTranslations|getTranslations|createTranslator)\s*\(\s*(?:\{[^}]*?namespace:\s*)?["'`]([\w.]+)["'`]/g;
const KEY_RE = /\bt(?:\.(?:rich|markup|raw|has))?\s*\(\s*["'`]([\w.]+)["'`]/g;
const DECL_RE = /i18n-keys:\s*([\w.\s]+)/g;
const GLOBAL_RE = /\bt\s*\(\s*["'`]([\w.]+)["'`]/g;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const namespaces = [...text.matchAll(NS_RE)].map((m) => m[1]);
  const keys = [...text.matchAll(KEY_RE)].map((m) => m[1]);
  for (const m of text.matchAll(DECL_RE)) for (const k of m[1].trim().split(/\s+/)) used.add(k);
  if (namespaces.length === 0 && keys.length > 0) {
    // `t` without a namespace in this file: keys are full paths.
    for (const m of text.matchAll(GLOBAL_RE)) used.add(m[1]);
    continue;
  }
  for (const key of keys) {
    const candidates = namespaces.map((ns) => `${ns}.${key}`);
    const hit = candidates.find((c) => baseKeys.has(c)) ?? (baseKeys.has(key) ? key : undefined);
    if (hit) used.add(hit);
    else
      findings.push(
        `${relative(root, file)}: key "${key}" not found under ${namespaces.join(", ")}`,
      );
  }
}

for (const k of baseKeys)
  if (!used.has(k))
    findings.push(`unused key "${k}" (declare it with // i18n-keys: if it is used dynamically)`);

if (findings.length) {
  console.error(
    `i18n check: ${findings.length} finding(s)\n` + findings.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}
console.log(`i18n check: ${locales.length} locales, ${baseKeys.size} keys, all used and complete`);
