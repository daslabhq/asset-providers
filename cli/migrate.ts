#!/usr/bin/env bun
/**
 * Migrate a v1 provider folder (provider.json listing tools) to the scene
 * layout (scene.json + assets/<type>/ + kb/). Mechanical and reversible:
 *
 *   bun cli/migrate.ts providers/kenko
 *
 * - provider.json → scene.json (identity + provider block) and
 *   assets/account/asset.json (credential fields, dashboardUrl, keyDescription)
 * - each assetTypes entry → assets/<id>/asset.json
 * - each tool → assets/<type>/tools/<stem>.ts (or .http.json); the type is
 *   guessed from the tool name (a declared type id appearing in it), else
 *   account. Module tools keep their code and get a .meta.json sibling with
 *   the schema from provider.json — exact, no behaviour change; rewriting them
 *   to defineTool is a separate, reviewable step (cli/to-define-tool.ts).
 * - the role:"browse" tool → browse.ts at the root (it dispatches on type)
 * - views/* → assets/<type>/view.html by the view's assetType
 * - docs/* → kb/*
 * - import paths inside moved .ts files are rewritten for their new depth
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, posix } from "node:path";

const folder = process.argv[2];
if (!folder || !existsSync(join(folder, "provider.json"))) {
  console.error("usage: bun cli/migrate.ts <v1 provider folder>");
  process.exit(2);
}
const m = JSON.parse(readFileSync(join(folder, "provider.json"), "utf-8"));
const id: string = m.id;
const typeIds: string[] = (m.assetTypes ?? []).map((a: any) => a.id);
const moves: Array<[string, string]> = [];
const write = (rel: string, content: string) => { const p = join(folder, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); console.log("  + " + rel); };
const move = (fromRel: string, toRel: string) => { const from = join(folder, fromRel), to = join(folder, toRel); if (!existsSync(from)) return; mkdirSync(dirname(to), { recursive: true }); renameSync(from, to); moves.push([fromRel, toRel]); console.log(`  ~ ${fromRel} → ${toRel}`); };
const json = (o: unknown) => JSON.stringify(o, null, 2) + "\n";

console.log(`migrating ${id} → scene layout`);

// scene.json
write("scene.json", json({
  name: m.name, icon: m.icon, color: m.color, logo: m.logo, website: m.website, visibility: m.visibility,
  provider: { id, auth: m.auth ?? { type: "none" }, envFallback: m.envFallback, contextMessage: m.contextMessage, instructionText: m.instructionText },
}));

// assets/account/asset.json
write("assets/account/asset.json", json({
  name: `${m.name} Account`,
  fields: m.account?.fields,
  dashboardUrl: m.account?.dashboardUrl,
  keyDescription: m.account?.keyDescription,
}));

// assets/<type>/asset.json
for (const a of m.assetTypes ?? []) {
  const { id: typeId, ...rest } = a;
  write(`assets/${typeId}/asset.json`, json(rest));
}

// tools
for (const t of m.tools ?? []) {
  if (t.role === "browse") {
    if (t.impl?.kind === "code" && t.impl.entry) move(t.impl.entry, "browse.ts");
    continue;
  }
  const typeId = typeIds.find((ty) => t.name.includes(ty) || t.name.includes(ty + "s")) ?? "account";
  const stem = t.name.replace(new RegExp(`^${id}_`), "").replace(new RegExp(`_${typeId}s?$`), "").replace(new RegExp(`_${typeId}s?_`), "_");
  const meta = { name: t.name, description: t.description, inputSchema: t.inputSchema, readOnly: t.readOnly, requiresApproval: t.requiresApproval, costPerCall: t.costPerCall };
  if (t.impl?.kind === "http_call") {
    const { kind: _k, ...call } = t.impl;
    write(`assets/${typeId}/tools/${stem}.http.json`, json({ ...meta, ...call }));
  } else if (t.impl?.kind === "code" && t.impl.entry) {
    move(t.impl.entry, `assets/${typeId}/tools/${stem}.ts`);
    write(`assets/${typeId}/tools/${stem}.meta.json`, json(meta));
  }
}

// views → assets/<type>/view.html by assetType (strip the provider prefix)
for (const v of m.views ?? m.widgets ?? []) {
  const typeId = String(v.assetType ?? "").replace(new RegExp(`^${id}_`), "");
  if (!typeId || !v.render) continue;
  move(v.render, `assets/${typeId}/view.html`);
  if (v.fixture) move(v.fixture, `assets/${typeId}/view.fixture.json`);
}

// docs → kb
if (existsSync(join(folder, "docs"))) for (const f of readdirSync(join(folder, "docs"))) move(`docs/${f}`, `kb/${f}`);

// rewrite relative imports in moved .ts files for their new location
for (const [fromRel, toRel] of moves) {
  if (!toRel.endsWith(".ts")) continue;
  const abs = join(folder, toRel);
  const src = readFileSync(abs, "utf-8");
  const out = src.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, (_m, a, spec, b) => {
    const target = posix.normalize(posix.join(posix.dirname(fromRel), spec));
    let rel = posix.relative(posix.dirname(toRel), target);
    if (!rel.startsWith(".")) rel = "./" + rel;
    return a + rel + b;
  });
  if (out !== src) { writeFileSync(abs, out); console.log("  ↻ imports rewritten in " + toRel); }
}

// retire the v1 manifest and empty folders
renameSync(join(folder, "provider.json"), join(folder, "provider.v1.json.bak"));
for (const d of ["tools", "views", "widgets", "docs"]) { const p = join(folder, d); if (existsSync(p) && statSync(p).isDirectory() && readdirSync(p).length === 0) rmSync(p, { recursive: true }); }
console.log("done — provider.json kept as provider.v1.json.bak until you delete it");
