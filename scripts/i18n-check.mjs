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
// `const t = useTranslations("ns")`, `const tl = await getTranslations("ns")`,
// `getTranslations({ locale, namespace: "ns" })`: the variable name is bound to the namespace.
const BIND_RE =
  /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations|createTranslator)\s*\(\s*(?:\{[^}]*?namespace:\s*)?["'`]([\w.]+)["'`]/g;
const DECL_RE = /i18n-keys:\s*([\w.\s]+)/g;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(DECL_RE)) for (const k of m[1].trim().split(/\s+/)) used.add(k);
  // One file may bind the same name (usually `t`) to several namespaces in different components;
  // a key counts as found when it exists under any of them.
  const bindings = new Map();
  for (const m of text.matchAll(BIND_RE)) {
    if (!bindings.has(m[1])) bindings.set(m[1], new Set());
    bindings.get(m[1]).add(m[2]);
  }
  for (const [name, namespaces] of bindings) {
    const keyRe = new RegExp(
      `\\b${name}(?:\\.(?:rich|markup|raw|has))?\\s*\\(\\s*["'\`]([\\w.]+)["'\`]`,
      "g",
    );
    for (const m of text.matchAll(keyRe)) {
      const key = m[1];
      const hit = [...namespaces].map((ns) => `${ns}.${key}`).find((k) => baseKeys.has(k));
      if (hit) used.add(hit);
      else if (baseKeys.has(key)) used.add(key);
      else
        findings.push(
          `${relative(root, file)}: key "${key}" not found under ${[...namespaces].join(", ")}`,
        );
    }
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
