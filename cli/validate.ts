#!/usr/bin/env bun
/**
 * Validate an asset-provider folder against the manifest spec.
 *
 *   bun cli/validate.ts providers/polyhaven     # one provider
 *   bun cli/validate.ts providers               # every provider folder
 *
 * Standalone on purpose — no imports beyond the runtime, so a contributor can
 * check a provider without any server code.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("usage: bun cli/validate.ts <provider-folder | providers-dir>");
  process.exit(2);
}

const folders = existsSync(join(target, "provider.json"))
  ? [target]
  : readdirSync(target)
      .map((name) => join(target, name))
      .filter((p) => statSync(p).isDirectory() && existsSync(join(p, "provider.json")));

if (folders.length === 0) {
  console.error(`no provider.json found under ${target}`);
  process.exit(2);
}

let failed = false;
for (const folder of folders) {
  const errors = validateProvider(folder);
  if (errors.length === 0) {
    console.log(`✓ ${folder}`);
  } else {
    failed = true;
    console.log(`✗ ${folder}`);
    for (const e of errors) console.log(`   - ${e}`);
  }
}
process.exit(failed ? 1 : 0);

function validateProvider(folder: string): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  let m: any;
  try {
    m = JSON.parse(readFileSync(join(folder, "provider.json"), "utf-8"));
  } catch (e) {
    return [`provider.json does not parse: ${e instanceof Error ? e.message : e}`];
  }

  checkIdentity(m, err);
  checkAuth(m, err);
  checkAssetTypes(m, err);
  checkTools(m, folder, err);
  checkViews(m, folder, err);
  checkKnowledge(m, folder, err);
  return errors;
}

function checkKnowledge(m: any, folder: string, err: (s: string) => void) {
  for (const d of m.knowledge?.docs ?? []) {
    if (!d.slug || !/^[a-z0-9][a-z0-9-]*$/.test(d.slug)) err(`knowledge doc slug '${d.slug}' must be lowercase kebab-case`);
    else if (!existsSync(join(folder, "docs", `${d.slug}.md`))) err(`knowledge doc '${d.slug}' has no docs/${d.slug}.md`);
    if (!d.title) err(`knowledge doc '${d.slug}' missing 'title'`);
  }
}

function checkIdentity(m: any, err: (s: string) => void) {
  if (!m.id) err("missing 'id'");
  else if (!/^[a-z0-9]+$/.test(m.id)) err(`id '${m.id}' must be lowercase alphanumeric, no hyphens`);
  if (!m.name) err("missing 'name'");
  if (m.color && !/^[0-9A-Fa-f]{6}$/.test(m.color)) err(`color '${m.color}' must be 6-char hex without '#'`);
}

function checkAuth(m: any, err: (s: string) => void) {
  const type = m.auth?.type ?? "none";
  if (type !== "api_key" && type !== "none") {
    err(`auth.type '${type}' not supported — use 'api_key' or 'none'`);
  }
  if (type === "api_key" && !m.account?.keyDescription && !m.account?.fields?.length) {
    err("api_key providers should set account.keyDescription (shown in the connect sheet) or account.fields");
  }
  const ids = new Set<string>();
  for (const f of m.account?.fields ?? []) {
    if (!f.id || !f.label) err("account.fields entries need 'id' and 'label'");
    if (ids.has(f.id)) err(`duplicate account field '${f.id}'`);
    ids.add(f.id);
  }
  if (type === "api_key" && m.account?.fields?.length) {
    const cf = m.auth?.credentialField ?? "api_key";
    if (!ids.has(cf)) err(`account.fields must include the credentialField '${cf}' (the field that marks the account as connected)`);
  }
}

function checkAssetTypes(m: any, err: (s: string) => void) {
  const types: any[] = m.assetTypes ?? [];
  const ids = new Set<string>();
  for (const a of types) {
    const label = a.id ?? "<missing id>";
    if (!a.id) err("assetType missing 'id'");
    else if (a.id === "account" || a.isAccountType) err(`assetType '${label}' — the account type is synthesized; declare only resource types`);
    else if (!/^[a-z0-9_]+$/.test(a.id)) err(`assetType id '${a.id}' must be lowercase (underscores OK), without provider prefix`);
    if (ids.has(a.id)) err(`duplicate assetType id '${a.id}'`);
    ids.add(a.id);
    if (!a.name) err(`assetType '${label}' missing 'name'`);
    if (a.parent && !types.some((o) => o.id === a.parent)) err(`assetType '${label}' parent '${a.parent}' is not declared`);
    for (const f of a.fields ?? []) {
      if (!f.key || !f.label) err(`assetType '${label}' has a field without key/label`);
    }
  }
  if (types.length > 0 && !(m.tools ?? []).some((t: any) => t.role === "browse")) {
    err("assetTypes declared but no tool has role 'browse' — the asset picker will be empty");
  }
}

function checkTools(m: any, folder: string, err: (s: string) => void) {
  const tools: any[] = m.tools ?? [];
  const names = new Set<string>();
  let browseCount = 0;
  for (const t of tools) {
    const label = t.name ?? "<missing name>";
    if (!t.name) err("tool missing 'name'");
    else if (!/^[a-z0-9_]+$/.test(t.name)) err(`tool name '${t.name}' must be lowercase with underscores ({provider}_{verb}_{noun})`);
    if (names.has(t.name)) err(`duplicate tool name '${t.name}'`);
    names.add(t.name);
    if (!t.description) err(`tool '${label}' missing 'description'`);
    if (t.inputSchema && t.inputSchema.type !== "object") err(`tool '${label}' inputSchema.type must be "object"`);
    if (t.role === "browse") browseCount++;

    const impl = t.impl;
    if (!impl?.kind) {
      err(`tool '${label}' missing impl.kind`);
    } else if (impl.kind === "code") {
      if (!impl.entry) err(`tool '${label}' code impl missing 'entry'`);
      else if (!existsSync(join(folder, impl.entry))) err(`tool '${label}' entry '${impl.entry}' does not exist`);
      else if (/^\s*import\s/m.test(readFileSync(join(folder, impl.entry), "utf-8"))) {
        err(`tool '${label}' entry '${impl.entry}' uses import — code tools are self-contained function bodies`);
      }
    } else if (impl.kind === "http_call") {
      if (!impl.method) err(`tool '${label}' http_call missing 'method'`);
      if (!impl.url) err(`tool '${label}' http_call missing 'url'`);
    } else {
      err(`tool '${label}' impl.kind '${impl.kind}' unknown — use 'http_call' or 'code'`);
    }
  }
  if (browseCount > 1) err(`${browseCount} tools have role 'browse' — only the first is used`);
}

function checkViews(m: any, folder: string, err: (s: string) => void) {
  for (const v of m.views ?? []) {
    const label = v.assetType ?? v.render ?? "<view>";
    if (!v.assetType) err(`view '${label}' missing 'assetType'`);
    if (!v.render) err(`view '${label}' missing 'render'`);
    else if (!existsSync(join(folder, v.render))) err(`view '${label}' render '${v.render}' does not exist`);
    if (v.fixture && !existsSync(join(folder, v.fixture))) err(`view '${label}' fixture '${v.fixture}' does not exist`);
  }
}
