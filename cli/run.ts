#!/usr/bin/env bun
/**
 * Run one of a provider's tools locally, against the real API.
 *
 *   bun cli/run.ts providers/kenko kenko_list_schedules '{"start_date":"2026-09-01"}' --credential api_key=…
 *   bun cli/run.ts providers/brave brave_web_search '{"query":"daslab"}' --credential api_key=BSA...
 *
 * Either layout. Same contract the Daslab server runs tools with: module
 * tools (defineTool objects or bare handlers) are imported and called with
 * (input, ctx); body-style tools are wrapped; http_call tools are templated
 * requests. Validate checks the files — run executes them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readProviderFolder, type DiscoveredTool } from "./layout";

const [folder, toolName, inputJson, ...rest] = process.argv.slice(2);
if (!folder || !toolName) {
  console.error("usage: bun cli/run.ts <provider-folder> <tool> ['<input json>'] [--credential key=value ...]");
  process.exit(2);
}

const input = inputJson && !inputJson.startsWith("--") ? JSON.parse(inputJson) : {};
const credential: Record<string, string> = {};
const flags = inputJson?.startsWith("--") ? [inputJson, ...rest] : rest;
for (let i = 0; i < flags.length; i++) {
  if (flags[i] === "--credential") {
    const [k, ...v] = String(flags[++i]).split("=");
    credential[k] = v.join("=");
  }
}

const provider = await readProviderFolder(folder);
const tool = provider.tools.find((t) => t.name === toolName);
if (!tool) {
  console.error(`no tool '${toolName}' in ${folder} — has: ${provider.tools.map((t) => t.name).join(", ")}`);
  process.exit(2);
}

const ctx = { input, credential, fetch: globalThis.fetch.bind(globalThis) };
const result = await runTool(tool);
console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));

async function runTool(t: DiscoveredTool): Promise<unknown> {
  if (t.impl.kind === "module") {
    const mod = await import(resolve(t.impl.path));
    const d = mod.default;
    const handler = typeof d === "function" ? d : d && typeof d.run === "function" ? d.run.bind(d) : null;
    if (!handler) throw new Error(`${t.impl.path} must export default a function or a defineTool/defineBrowse object`);
    return handler(input, ctx);
  }
  if (t.impl.kind === "body") {
    const source = readFileSync(t.impl.path, "utf-8");
    const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (ctx: unknown) => Promise<unknown>;
    return new AsyncFunction("ctx", source)(ctx);
  }
  return runHttpCall(t.impl.call);
}

/** http_call: resolve templates ({{input.x}}, {{credential.y}}, {{x?}} optional; object templates), request, extract output. */
async function runHttpCall(impl: any): Promise<unknown> {
  const bag = (from: string) => (from === "credential" ? credential : input) as Record<string, unknown>;
  const interpolate = (text: string): string =>
    text.replace(/\{\{?(input|credential)\.([a-zA-Z0-9_]+)(\?)?\}\}?/g, (_m, from, key, optional) => {
      const v = bag(from)[key];
      if (v == null || v === "") {
        if (optional) return "";
        throw new Error(`template missing ${from}.${key}${from === "credential" ? " (pass --credential " + key + "=...)" : ""}`);
      }
      return String(v);
    });
  const resolveT = (t: any): unknown => {
    if (t == null) return undefined;
    if (typeof t === "string") {
      const lone = t.match(/^\{\{?(input|credential)\.([a-zA-Z0-9_]+)\?\}\}?$/);
      if (lone) { const v = bag(lone[1])[lone[2]]; return v == null || v === "" ? undefined : v; }
      return interpolate(t);
    }
    if (typeof t !== "object") return t;
    if ("literal" in t) return t.literal;
    if (t.from) {
      const v = bag(t.from)[t.key];
      if (v == null) { if (t.optional) return undefined; throw new Error(`missing ${t.from}.${t.key}`); }
      return v;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(t)) out[k] = resolveT(v);
    return out;
  };

  const url = new URL(String(resolveT(impl.url)));
  for (const [k, t] of Object.entries(impl.query ?? {})) { const v = resolveT(t); if (v !== undefined) url.searchParams.set(k, String(v)); }
  const headers: Record<string, string> = {};
  for (const [k, t] of Object.entries(impl.headers ?? {})) { const v = resolveT(t); if (v !== undefined) headers[k] = String(v); }
  const init: RequestInit = { method: impl.method, headers };
  if (impl.body !== undefined && impl.method !== "GET") {
    const body = resolveT(impl.body);
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }
  const resp = await fetch(url, init);
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}: ${text.slice(0, 300)}`);
  let out: unknown;
  try { out = JSON.parse(text); } catch { return text; }
  if (impl.output?.path) for (const part of String(impl.output.path).replace(/^\$\.?/, "").split(".").filter(Boolean)) out = (out as any)?.[part];
  const rendered = impl.output?.wrap === "text" ? String(out) : JSON.stringify(out, null, 2);
  return impl.output?.prefix ? impl.output.prefix + "\n" + rendered : rendered;
}
