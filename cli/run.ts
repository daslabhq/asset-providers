#!/usr/bin/env bun
/**
 * Run one of a provider's tools locally, against the real API.
 *
 *   bun cli/run.ts providers/polymarket polymarket_search '{"query":"election"}'
 *   bun cli/run.ts providers/brave brave_web_search '{"query":"daslab"}' --credential api_key=BSA...
 *
 * Implements the same contract the Daslab server runs tools with (see
 * spec/01-manifest.md): code impls are function bodies reading ctx.input /
 * ctx.credential, http_call impls are templated requests. This is the local
 * loop — validate checks the files, run executes them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

const manifest = JSON.parse(readFileSync(join(folder, "provider.json"), "utf-8"));
const tool = (manifest.tools ?? []).find((t: any) => t.name === toolName);
if (!tool) {
  console.error(`no tool '${toolName}' in ${folder} — has: ${(manifest.tools ?? []).map((t: any) => t.name).join(", ")}`);
  process.exit(2);
}

const result = tool.impl.kind === "code"
  ? await runCode(tool.impl)
  : await runHttpCall(tool.impl);
console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));

/** Code impls are function bodies: reads ctx.input / ctx.credential, returns a value. */
async function runCode(impl: { entry: string }): Promise<unknown> {
  const source = readFileSync(join(folder, impl.entry), "utf-8");
  const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (ctx: unknown) => Promise<unknown>;
  const body = new AsyncFunction("ctx", source);
  return body({ input, credential, fetch: globalThis.fetch.bind(globalThis) });
}

/** http_call impls: resolve templates, make the request, extract output. */
async function runHttpCall(impl: any): Promise<unknown> {
  const interpolate = (text: string): string =>
    text.replace(/\{(input|credential)\.([a-zA-Z0-9_]+)\}/g, (_m, from, key) => {
      const v = (from === "credential" ? credential : input)[key];
      if (v == null) throw new Error(`template missing ${from}.${key}${from === "credential" ? " (pass --credential " + key + "=...)" : ""}`);
      return String(v);
    });
  const resolve = (t: any): string | undefined => {
    if (t == null) return undefined;
    if (typeof t === "string") return interpolate(t);
    if (typeof t !== "object") return String(t);
    if ("literal" in t) return String(t.literal);
    const source = t.from === "credential" ? credential : input;
    const value = (source as any)[t.key];
    if (value == null) {
      if (t.optional) return undefined;
      throw new Error(`missing ${t.from}.${t.key}${t.from === "credential" ? " (pass --credential " + t.key + "=...)" : ""}`);
    }
    return String(value);
  };

  const url = new URL(
    impl.url.replace(/\{(input|credential)\.([^}]+)\}/g, (_: string, from: string, key: string) =>
      resolve({ from, key }) ?? "",
    ),
  );
  for (const [k, t] of Object.entries(impl.query ?? {})) {
    const v = resolve(t);
    if (v !== undefined) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {};
  for (const [k, t] of Object.entries(impl.headers ?? {})) {
    const v = resolve(t);
    if (v !== undefined) headers[k] = v;
  }

  const resp = await fetch(url, {
    method: impl.method,
    headers,
    ...(impl.body ? { body: JSON.stringify(impl.body) } : {}),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}: ${text.slice(0, 300)}`);

  let out: unknown;
  try {
    out = JSON.parse(text);
  } catch {
    return text;
  }
  if (impl.output?.path) {
    for (const part of String(impl.output.path).replace(/^\$\.?/, "").split(".").filter(Boolean)) {
      out = (out as any)?.[part];
    }
  }
  const rendered = impl.output?.wrap === "text" ? String(out) : JSON.stringify(out, null, 2);
  return impl.output?.prefix ? impl.output.prefix + "\n" + rendered : rendered;
}
