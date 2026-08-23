/**
 * Shared by the CLI: read a provider folder in either layout and list its tools.
 *
 *   scene layout  — scene.json + assets/<type>/{asset.json,tools/,browse.ts} + kb/
 *   v1 layout     — provider.json listing tools with entries
 *
 * Standalone on purpose (no server code). Module tools are imported to read
 * their defineTool metadata, which is why cli commands are async.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export interface DiscoveredTool {
  name: string;
  description?: string;
  role?: "browse";
  forType?: string;
  readOnly?: boolean;
  requiresApproval?: boolean;
  inputSchema?: Record<string, unknown>;
  /** How to run it. */
  impl:
    | { kind: "module"; path: string }              // default export: defineTool object or handler
    | { kind: "body"; path: string }                // statements reading ctx.input
    | { kind: "http_call"; call: Record<string, unknown> };
}

export interface ProviderFolder {
  layout: "scene" | "v1";
  id: string;
  name: string;
  tools: DiscoveredTool[];
}

export async function readProviderFolder(folder: string): Promise<ProviderFolder> {
  if (existsSync(join(folder, "scene.json")) && !existsSync(join(folder, "provider.json"))) return readSceneLayout(folder);
  if (existsSync(join(folder, "provider.json"))) return readV1Layout(folder);
  throw new Error(`${folder} has neither scene.json nor provider.json`);
}

// ---- scene layout ---------------------------------------------------------------

async function readSceneLayout(folder: string): Promise<ProviderFolder> {
  const scene = JSON.parse(readFileSync(join(folder, "scene.json"), "utf-8"));
  const id: string = scene.provider?.id;
  if (!id) throw new Error("scene.json needs provider.id");
  const tools: DiscoveredTool[] = [];

  const assetsDir = join(folder, "assets");
  const typeIds = existsSync(assetsDir) ? readdirSync(assetsDir).filter((n) => statSync(join(assetsDir, n)).isDirectory()).sort() : [];
  for (const typeId of typeIds) {
    const browse = join(assetsDir, typeId, "browse.ts");
    if (existsSync(browse)) tools.push({ name: `${id}_browse_${typeId}`, role: "browse", forType: typeId, impl: { kind: "module", path: browse } });
    const toolsDir = join(assetsDir, typeId, "tools");
    if (!existsSync(toolsDir)) continue;
    for (const file of readdirSync(toolsDir).sort()) {
      const path = join(toolsDir, file);
      if (file.endsWith(".http.json")) {
        const j = JSON.parse(readFileSync(path, "utf-8"));
        const { name, description, input, inputSchema, required, readOnly, requiresApproval, costPerCall, ...call } = j;
        tools.push({ name: name ?? defaultName(id, typeId, file), description, readOnly, requiresApproval, inputSchema: inputSchema ?? { type: "object", properties: input ?? {}, ...(required?.length ? { required } : {}) }, impl: { kind: "http_call", call } });
      } else if (file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".d.ts")) {
        const src = readFileSync(path, "utf-8");
        if (/^\s*export\s+default\b/m.test(src)) {
          const mod = await import(resolve(path));
          const d = mod.default;
          if (typeof d === "function") {
            const meta = sibling(path);
            if (!meta) throw new Error(`${path}: a bare handler needs a defineTool wrapper or a .meta.json sibling`);
            tools.push({ ...meta, name: meta.name ?? defaultName(id, typeId, file), impl: { kind: "module", path } });
          } else if (d?.__daslab === "tool") {
            tools.push({ name: d.name ?? defaultName(id, typeId, file), description: d.description, readOnly: d.readOnly, requiresApproval: d.requiresApproval, inputSchema: d.inputSchema ?? { type: "object", properties: d.input ?? {}, ...(d.required?.length ? { required: d.required } : {}) }, impl: { kind: "module", path } });
          } else if (d?.__daslab === "browse") {
            throw new Error(`${path}: defineBrowse belongs in assets/${typeId}/browse.ts`);
          } else {
            throw new Error(`${path}: default export must be defineTool(...) or a function`);
          }
        } else {
          const meta = sibling(path);
          if (!meta) throw new Error(`${path}: body-style tools need a .meta.json sibling`);
          tools.push({ ...meta, name: meta.name ?? defaultName(id, typeId, file), impl: { kind: "body", path } });
        }
      }
    }
  }
  const rootBrowse = join(folder, "browse.ts");
  if (existsSync(rootBrowse)) tools.push({ name: `${id}_browse`, role: "browse", impl: { kind: "module", path: rootBrowse } });
  return { layout: "scene", id, name: scene.name, tools };
}

function sibling(path: string): Partial<DiscoveredTool> | null {
  const p = path.replace(/\.ts$/, ".meta.json");
  if (!existsSync(p)) return null;
  const j = JSON.parse(readFileSync(p, "utf-8"));
  return { name: j.name, description: j.description, readOnly: j.readOnly, requiresApproval: j.requiresApproval, inputSchema: j.inputSchema ?? { type: "object", properties: j.input ?? {}, ...(j.required?.length ? { required: j.required } : {}) } };
}

function defaultName(id: string, typeId: string, file: string): string {
  const stem = file.replace(/\.(http\.json|ts)$/, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  return typeId === "account" ? `${id}_${stem}` : `${id}_${stem}_${typeId}`;
}

// ---- v1 layout --------------------------------------------------------------------

function readV1Layout(folder: string): ProviderFolder {
  const m = JSON.parse(readFileSync(join(folder, "provider.json"), "utf-8"));
  const tools: DiscoveredTool[] = (m.tools ?? []).map((t: any) => {
    const base = { name: t.name, description: t.description, role: t.role, readOnly: t.readOnly, requiresApproval: t.requiresApproval, inputSchema: t.inputSchema };
    if (t.impl?.kind === "http_call") return { ...base, impl: { kind: "http_call", call: t.impl } };
    const path = join(folder, t.impl.entry);
    const src = readFileSync(path, "utf-8");
    return { ...base, impl: { kind: /^\s*export\s+default\b/m.test(src) ? "module" : "body", path } };
  });
  return { layout: "v1", id: m.id, name: m.name, tools };
}
