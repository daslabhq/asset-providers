#!/usr/bin/env bun
/**
 * Turn a migrated module tool (bare `export default async function (input, ctx)`
 * + a .meta.json sibling) into a single defineTool file, and delete the sibling.
 *
 *   bun cli/to-define-tool.ts providers/kenko
 *
 * Only touches files whose shape it recognises; everything else is left
 * alone and listed. Review the diff — this rewrites source.
 */
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const folder = process.argv[2];
if (!folder) { console.error("usage: bun cli/to-define-tool.ts <provider folder>"); process.exit(2); }

const assetsDir = join(folder, "assets");
let converted = 0;
for (const typeId of readdirSync(assetsDir)) {
  const toolsDir = join(assetsDir, typeId, "tools");
  if (!existsSync(toolsDir) || !statSync(toolsDir).isDirectory()) continue;
  for (const f of readdirSync(toolsDir)) {
    if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
    const path = join(toolsDir, f);
    const metaPath = path.replace(/\.ts$/, ".meta.json");
    if (!existsSync(metaPath)) continue;
    const src = readFileSync(path, "utf-8");
    const m = src.match(/^([\s\S]*?)export default async function\s*\(([^)]*)\)\s*\{\n([\s\S]*)\n\}\s*$/);
    if (!m) { console.log(`  skip ${path} (unrecognised shape)`); continue; }
    const [, head, params, body] = m;
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const props = meta.inputSchema?.properties ?? {};
    const required = meta.inputSchema?.required ?? [];
    const metaLines = [
      `  name: ${JSON.stringify(meta.name)},`,
      `  description: ${JSON.stringify(meta.description)},`,
      meta.readOnly ? `  readOnly: true,` : null,
      meta.requiresApproval ? `  requiresApproval: true,` : null,
      meta.costPerCall != null ? `  costPerCall: ${meta.costPerCall},` : null,
      Object.keys(props).length ? `  input: ${JSON.stringify(props, null, 2).replace(/\n/g, "\n  ")},` : null,
      required.length ? `  required: ${JSON.stringify(required)},` : null,
    ].filter(Boolean).join("\n");
    const importLine = `import { defineTool } from "@daslabhq/asset-provider";\n`;
    const newHead = head.includes("@daslabhq/asset-provider") ? head : importLine + head;
    const indented = body.split("\n").map((l) => (l.length ? "  " + l : l)).join("\n");
    const out = `${newHead}export default defineTool({\n${metaLines}\n  async run(${params}) {\n${indented}\n  },\n});\n`;
    writeFileSync(path, out);
    unlinkSync(metaPath);
    converted++;
    console.log(`  ✓ ${path}`);
  }
}
console.log(`converted ${converted} tool(s)`);
