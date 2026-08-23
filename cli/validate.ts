#!/usr/bin/env bun
/**
 * Validate an asset-provider folder — either layout.
 *
 *   bun cli/validate.ts providers/kenko     # one provider
 *   bun cli/validate.ts providers           # every provider folder
 *
 * Scene layout: scene.json + assets/<type>/asset.json + tools discovered from
 * the tree (module tools are imported to read their defineTool metadata) +
 * kb/*.md. v1 layout: provider.json listing tools. Standalone — no server code.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readProviderFolder } from "./layout";

const target = process.argv[2];
if (!target) {
  console.error("usage: bun cli/validate.ts <provider-folder | providers-dir>");
  process.exit(2);
}

const isProvider = (p: string) => existsSync(join(p, "provider.json")) || existsSync(join(p, "scene.json"));
const folders = isProvider(target)
  ? [target]
  : readdirSync(target).map((name) => join(target, name)).filter((p) => statSync(p).isDirectory() && isProvider(p));

if (folders.length === 0) {
  console.error(`no provider.json or scene.json found under ${target}`);
  process.exit(2);
}

let failed = false;
for (const folder of folders) {
  const errors = await validateProvider(folder);
  if (errors.length === 0) {
    console.log(`✓ ${folder}`);
  } else {
    failed = true;
    console.log(`✗ ${folder}`);
    for (const e of errors) console.log(`   - ${e}`);
  }
}
process.exit(failed ? 1 : 0);

async function validateProvider(folder: string): Promise<string[]> {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  try {
    if (existsSync(join(folder, "scene.json")) && !existsSync(join(folder, "provider.json"))) {
      await validateSceneLayout(folder, err);
    } else {
      validateV1(folder, err);
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
  }
  return errors;
}

// ---- scene layout -------------------------------------------------------------

async function validateSceneLayout(folder: string, err: (s: string) => void) {
  const scene = parse(folder, "scene.json", err);
  if (!scene) return;
  if (!scene.name) err("scene.json missing 'name'");
  const prov = scene.provider;
  if (!prov?.id) err("scene.json missing provider.id");
  else if (!/^[a-z0-9]+$/.test(prov.id)) err(`provider.id '${prov.id}' must be lowercase alphanumeric, no hyphens`);
  if (scene.color && !/^[0-9A-Fa-f]{6}$/.test(scene.color)) err(`color '${scene.color}' must be 6-char hex without '#'`);
  const authType = prov?.auth?.type ?? "none";
  if (authType !== "api_key" && authType !== "none") err(`provider.auth.type '${authType}' not supported — use 'api_key' or 'none'`);

  // account
  const account = existsSync(join(folder, "assets/account/asset.json")) ? parse(folder, "assets/account/asset.json", err) : {};
  if (authType === "api_key") {
    const cf = prov.auth?.credentialField ?? "api_key";
    const ids = new Set<string>();
    for (const f of account?.fields ?? []) {
      if (!f.id || !f.label) err("assets/account/asset.json fields need 'id' and 'label'");
      if (ids.has(f.id)) err(`duplicate account field '${f.id}'`);
      ids.add(f.id);
    }
    if (account?.fields?.length && !ids.has(cf)) err(`assets/account/asset.json fields must include the credentialField '${cf}'`);
    if (!account?.fields?.length && !account?.keyDescription) err("api_key providers should declare assets/account/asset.json with fields or keyDescription");
  }

  // resource types
  const assetsDir = join(folder, "assets");
  const typeIds = existsSync(assetsDir) ? readdirSync(assetsDir).filter((n) => statSync(join(assetsDir, n)).isDirectory()) : [];
  for (const typeId of typeIds) {
    if (typeId === "account") continue;
    if (!/^[a-z0-9_]+$/.test(typeId)) err(`asset type folder '${typeId}' must be lowercase (underscores OK)`);
    const def = parse(folder, `assets/${typeId}/asset.json`, err);
    if (def && !def.name) err(`assets/${typeId}/asset.json missing 'name'`);
    if (def?.parent && !typeIds.includes(def.parent)) err(`assets/${typeId} parent '${def.parent}' has no folder`);
    for (const f of def?.fields ?? []) if (!f.key || !f.label) err(`assets/${typeId}/asset.json has a field without key/label`);
    if (def?.tile && !["image", "metric"].includes(def.tile.type)) err(`assets/${typeId} tile.type must be image or metric`);
  }

  // tools (imports module tools for their metadata)
  const prov2 = await readProviderFolder(folder);
  const names = new Set<string>();
  for (const t of prov2.tools) {
    if (names.has(t.name)) err(`duplicate tool name '${t.name}'`);
    names.add(t.name);
    if (!/^[a-z0-9_]+$/.test(t.name)) err(`tool name '${t.name}' must be lowercase with underscores`);
    if (t.role !== "browse" && !t.description) err(`tool '${t.name}' has no description`);
    if (t.inputSchema && (t.inputSchema as any).type !== "object") err(`tool '${t.name}' inputSchema.type must be "object"`);
    if (t.impl.kind === "http_call" && (!t.impl.call.method || !t.impl.call.url)) err(`tool '${t.name}' http_call needs method and url`);
    if (t.impl.kind === "module") checkImportsResolve(folder, t.impl.path, err);
  }
  const resourceTypesWithoutBrowse = typeIds.filter((ty) => ty !== "account" && !existsSync(join(assetsDir, ty, "browse.ts")));
  if (resourceTypesWithoutBrowse.length && !existsSync(join(folder, "browse.ts"))) {
    err(`no browse for asset type(s) ${resourceTypesWithoutBrowse.join(", ")} — add assets/<type>/browse.ts or a root browse.ts`);
  }

  // kb
  if (existsSync(join(folder, "kb"))) {
    for (const f of readdirSync(join(folder, "kb"))) {
      if (!f.endsWith(".md")) { err(`kb/${f} is not markdown`); continue; }
      const slug = f.replace(/\.md$/, "");
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) err(`kb/${f}: slug must be lowercase kebab-case`);
      const text = readFileSync(join(folder, "kb", f), "utf-8");
      if (!/^#\s+\S/m.test(text) && !/^title:/m.test(text)) err(`kb/${f} needs an H1 or front-matter title`);
    }
  }
  if (existsSync(join(folder, "docs"))) err("'docs/' is not a thing — the knowledge base is kb/*.md");
}

function checkImportsResolve(folder: string, path: string, err: (s: string) => void) {
  const src = readFileSync(path, "utf-8");
  for (const m of src.matchAll(/^\s*import\s[^'"]*['"](\.[^'"]+)['"]/gm)) {
    const target = m[1];
    const base = join(path, "..", target);
    if (![base, base + ".ts", base + ".js", join(base, "index.ts")].some((p) => existsSync(p))) {
      err(`${path.slice(folder.length + 1)} imports '${target}' which is not in the provider folder`);
    }
  }
}

// ---- v1 layout ----------------------------------------------------------------

function validateV1(folder: string, err: (s: string) => void) {
  const m = parse(folder, "provider.json", err);
  if (!m) return;
  if (!m.id) err("missing 'id'");
  else if (!/^[a-z0-9]+$/.test(m.id)) err(`id '${m.id}' must be lowercase alphanumeric, no hyphens`);
  if (!m.name) err("missing 'name'");
  const type = m.auth?.type ?? "none";
  if (type !== "api_key" && type !== "none") err(`auth.type '${type}' not supported — use 'api_key' or 'none'`);
  for (const a of m.assetTypes ?? []) {
    if (!a.id) err("assetType missing 'id'");
    else if (a.id === "account" || a.isAccountType) err(`assetType '${a.id}' — the account type is synthesized; declare only resource types`);
    if (!a.name) err(`assetType '${a.id}' missing 'name'`);
  }
  const names = new Set<string>();
  for (const t of m.tools ?? []) {
    if (!t.name) err("tool missing 'name'");
    if (names.has(t.name)) err(`duplicate tool name '${t.name}'`);
    names.add(t.name);
    if (!t.description) err(`tool '${t.name}' missing 'description'`);
    if (!t.impl?.kind) err(`tool '${t.name}' missing impl.kind`);
    else if (t.impl.kind === "code" && t.impl.entry && !existsSync(join(folder, t.impl.entry))) err(`tool '${t.name}' entry '${t.impl.entry}' does not exist`);
    else if (t.impl.kind === "code" && t.impl.entry) checkImportsResolve(folder, join(folder, t.impl.entry), err);
    else if (t.impl.kind === "http_call" && (!t.impl.method || !t.impl.url)) err(`tool '${t.name}' http_call missing method/url`);
  }
  if ((m.assetTypes ?? []).length > 0 && !(m.tools ?? []).some((t: any) => t.role === "browse")) err("assetTypes declared but no tool has role 'browse'");
  for (const v of m.views ?? []) {
    if (!v.render || !existsSync(join(folder, v.render))) err(`view render '${v.render}' does not exist`);
    if (v.fixture && !existsSync(join(folder, v.fixture))) err(`view fixture '${v.fixture}' does not exist`);
  }
  for (const d of m.knowledge?.docs ?? []) {
    if (!d.slug || !existsSync(join(folder, "docs", `${d.slug}.md`))) err(`knowledge doc '${d.slug}' has no docs/${d.slug}.md`);
  }
}

function parse(folder: string, rel: string, err: (s: string) => void): any {
  try {
    return JSON.parse(readFileSync(join(folder, rel), "utf-8"));
  } catch (e) {
    err(`${rel} does not parse: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
