// Claude Code PostToolUse hook (A6): after Claude edits or writes a file in the app,
// format it with Prettier and typecheck the project. Findings go to stderr with exit 2,
// which Claude Code feeds back to the model. Files outside the app (docs/, design/) are skipped.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  filePath = JSON.parse(input)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath || !existsSync(filePath)) process.exit(0);

const root = process.cwd();
const rel = relative(root, resolve(filePath));
if (rel.startsWith("..") || rel.split(sep)[0] === "docs" || rel.split(sep)[0] === "design")
  process.exit(0);

const ext = rel.slice(rel.lastIndexOf("."));
const formattable = [".ts", ".tsx", ".mjs", ".js", ".json", ".css", ".yml", ".yaml"];
const problems = [];

if (formattable.includes(ext) && !rel.endsWith("tokens.css")) {
  try {
    execFileSync("npx", ["prettier", "--write", "--log-level", "warn", rel], {
      stdio: "pipe",
      shell: true,
    });
  } catch (e) {
    problems.push(`prettier: ${e.stderr?.toString() || e.message}`);
  }
}

if ([".ts", ".tsx"].includes(ext)) {
  try {
    execFileSync("npx", ["tsc", "--noEmit", "--pretty", "false"], { stdio: "pipe", shell: true });
  } catch (e) {
    const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    problems.push(`typecheck:\n${out.trim().split("\n").slice(0, 30).join("\n")}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n\n"));
  process.exit(2);
}
