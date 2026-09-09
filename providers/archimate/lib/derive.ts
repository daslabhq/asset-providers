/**
 * Derive the current-state model of a scene from what the scene holds and
 * what ran in it. The agent supplies the snapshot (assets, jobs, members,
 * policies) from the scene tools; this turns it into elements and
 * relationships that pass the standard's relationship table.
 *
 * Mapping, in one table:
 *   scene                       → Grouping
 *   provider (from asset types) → ApplicationComponent
 *   provider account asset      → ApplicationInterface, composed by its component
 *   device-like asset           → Device (physical providers → Equipment), serving its component
 *   agent asset                 → ApplicationComponent, specialised as an agent
 *   note / document asset       → Representation
 *   script asset                → ApplicationProcess, assigned to the engine
 *   any other resource asset    → DataObject, accessed by its provider's component
 *   human member                → BusinessActor, assigned to a BusinessRole
 *   tool used by a job          → ApplicationFunction, assigned to its provider
 *   job                         → BusinessProcess, served by the functions it used
 *   tool order within a job     → Flow between the functions, deduplicated
 *   policy / approval rule      → Constraint, associated with the function it governs
 */
import type { Element, Model, Relationship } from "./model";
import { slug } from "./model";

export interface SceneSnapshot {
  scene: { id?: string; name: string; description?: string };
  assets?: Array<{ id?: string; name: string; type: string; provider?: string; status?: string; description?: string }>;
  jobs?: Array<{ id?: string; title: string; status?: string; tools?: string[]; created_at?: string }>;
  members?: Array<{ name: string; role?: string; kind?: "human" | "agent" }>;
  policies?: Array<{ name: string; tool?: string; description?: string }>;
  children?: Array<{ id?: string; name: string }>;
  options?: { maxJobs?: number };
}

const PHYSICAL_PROVIDERS = new Set(["bambu", "onshape", "edge", "cumulocity", "mqtt", "isaacsim", "camera", "roboflow", "starlink", "limble", "joblogic"]);
const DEVICE_TYPES = /(device|machine|node|pi|edge|camera|robot|arm|sensor|printer|mac|iphone|ipad)/i;
const ENGINE_PREFIXES = new Set(["run", "look", "sandbox", "http", "show", "report", "get", "docs", "daslab", "ask", "describe"]);
/** Tool prefixes that belong to a provider whose id is spelled differently. */
const PREFIX_ALIASES: Record<string, string> = { calendar: "google_calendar", drive: "google_drive", docs: "google_docs", sheets: "google_sheets", create: "github", merge: "github", list: "github", search: "github", issue: "github", pull: "github", push: "github" };

export function deriveModel(snap: SceneSnapshot): Model {
  const els = new Map<string, Element>();
  const rels: Relationship[] = [];
  const seen = new Set<string>();
  const add = (id: string, type: string, name: string, extra: Partial<Element> = {}): Element => {
    const key = slug(id);
    if (!els.has(key)) els.set(key, { id: key, type, name, ...extra });
    return els.get(key)!;
  };
  const link = (type: string, source: Element, target: Element, extra: Partial<Relationship> = {}) => {
    const k = `${type}:${source.id}>${target.id}`;
    if (seen.has(k)) return;
    seen.add(k);
    rels.push({ id: `rel-${slug(k)}`, type, source: source.id, target: target.id, ...extra });
  };

  const scene = add(`scene-${snap.scene.id ?? snap.scene.name}`, "Grouping", snap.scene.name, { documentation: snap.scene.description });
  const engine = add("provider-daslab", "ApplicationComponent", "Daslab", { properties: { provider: "daslab" } });
  link("Aggregation", scene, engine);

  const providerOf = (s: string) => {
    const p = s.includes("/") ? s.split("/")[0] : s.split("_")[0];
    if (ENGINE_PREFIXES.has(p)) return "daslab";
    return PREFIX_ALIASES[p] ?? p;
  };
  const component = (provider: string) => {
    const c = add(`provider-${provider}`, "ApplicationComponent", titleCase(provider), { properties: { provider } });
    link("Aggregation", scene, c);
    return c;
  };

  for (const a of snap.assets ?? []) {
    const provider = a.provider ?? providerOf(a.type);
    const typeName = a.type.includes("/") ? a.type.split("/")[1] : a.type;
    const comp = component(provider);
    const props = { asset_type: a.type, ...(a.status ? { status: a.status } : {}) };
    const id = `asset-${a.id ?? a.type + "-" + a.name}`;
    if (typeName === "account") {
      const iface = add(id, "ApplicationInterface", `${a.name} (${titleCase(provider)} account)`, { properties: props });
      link("Composition", comp, iface);
    } else if (typeName === "agent") {
      const agent = add(id, "ApplicationComponent", a.name, { properties: { ...props, kind: "agent" }, documentation: a.description });
      link("Specialization", agent, engine);
      link("Aggregation", scene, agent);
    } else if (typeName === "script" || typeName === "fn" || typeName === "function") {
      const proc = add(id, "ApplicationProcess", a.name, { properties: props, documentation: a.description });
      link("Assignment", engine, proc);
    } else if (["note","doc","document","file","webview","view","cell"].includes(typeName)) {
      const rep = add(id, "Representation", a.name, { properties: props });
      link("Access", engine, rep, { accessType: "ReadWrite" });
    } else if (typeName === "scene") {
      const child = add(id, "Grouping", a.name, { properties: props });
      link("Aggregation", scene, child);
    } else if (PHYSICAL_PROVIDERS.has(provider) && DEVICE_TYPES.test(typeName + " " + a.name)) {
      const eq = add(id, "Equipment", a.name, { properties: props });
      link("Serving", eq, comp);
    } else if (DEVICE_TYPES.test(typeName)) {
      const dev = add(id, "Device", a.name, { properties: props });
      link("Serving", dev, comp);
    } else {
      const obj = add(id, "DataObject", a.name, { properties: props, documentation: a.description });
      link("Access", comp, obj, { accessType: "ReadWrite" });
    }
  }

  for (const c of snap.children ?? []) link("Aggregation", scene, add(`scene-${c.id ?? c.name}`, "Grouping", c.name));

  for (const m of snap.members ?? []) {
    if (m.kind === "agent") { link("Aggregation", scene, add(`member-${m.name}`, "ApplicationComponent", m.name, { properties: { kind: "agent" } })); continue; }
    const actor = add(`member-${m.name}`, "BusinessActor", m.name);
    const role = add(`role-${m.role ?? "member"}`, "BusinessRole", titleCase(m.role ?? "member"));
    link("Assignment", actor, role);
    link("Aggregation", scene, actor);
  }

  const fn = (tool: string) => {
    const f = add(`tool-${tool}`, "ApplicationFunction", tool);
    link("Assignment", component(providerOf(tool)), f);
    return f;
  };
  const jobs = (snap.jobs ?? []).slice(0, snap.options?.maxJobs ?? 40);
  for (const j of jobs) {
    const proc = add(`job-${j.id ?? j.title}`, "BusinessProcess", j.title, { properties: { ...(j.status ? { status: j.status } : {}), ...(j.created_at ? { created_at: j.created_at } : {}) } });
    link("Aggregation", scene, proc);
    const tools = Array.from(new Set(j.tools ?? []));
    tools.forEach((t) => link("Serving", fn(t), proc));
    for (let i = 1; i < (j.tools ?? []).length; i++) {
      const a = j.tools![i - 1], b = j.tools![i];
      if (a !== b) link("Flow", fn(a), fn(b));
    }
  }

  for (const p of snap.policies ?? []) {
    const c = add(`policy-${p.name}`, "Constraint", p.name, { documentation: p.description });
    if (p.tool) link("Association", c, fn(p.tool));
    else link("Association", c, scene);
  }

  return {
    name: `${snap.scene.name} (current state)`,
    version: "3.2",
    elements: Array.from(els.values()),
    relationships: rels,
    source: `derived from scene ${snap.scene.id ?? snap.scene.name}`,
    generatedAt: new Date().toISOString(),
  };
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
