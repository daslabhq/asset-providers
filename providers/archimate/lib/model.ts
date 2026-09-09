/**
 * The model: elements, relationships, validation, and the exchange format.
 *
 * A model is plain JSON. It travels inside the `model` field of a pinned
 * `archimate/model` asset as a string, and in and out of tools as an object.
 */
import { CONCEPT_BY_NAME, RELATIONSHIPS, resolveConcept } from "./concepts";
import table from "./relationships.json";

export interface Element {
  id: string;
  type: string;                 // a concept name, e.g. "BusinessActor"
  name: string;
  documentation?: string;
  properties?: Record<string, string>;
}

export interface Relationship {
  id: string;
  type: string;                 // a relationship name, e.g. "Serving"
  source: string;               // element id
  target: string;               // element id
  name?: string;
  accessType?: "Read" | "Write" | "ReadWrite" | "Access";
}

export interface Model {
  name: string;
  version: "3.2";
  elements: Element[];
  relationships: Relationship[];
  documentation?: string;
  source?: string;              // where it came from: "derived from scene …", "imported from …"
  generatedAt?: string;
}

const MATRIX = (table as { matrix: Record<string, Record<string, string>> }).matrix;
const KEY_OF = Object.fromEntries(Object.entries(RELATIONSHIPS).map(([n, r]) => [n, r.key]));

export function emptyModel(name: string): Model {
  return { name, version: "3.2", elements: [], relationships: [] };
}

export function parseModel(input: unknown): Model {
  const m = typeof input === "string" ? JSON.parse(input) : input;
  if (!m || typeof m !== "object" || !Array.isArray((m as Model).elements)) throw new Error("Not a model: expected { name, elements, relationships }.");
  const model = m as Model;
  model.relationships ||= [];
  model.version = "3.2";
  return model;
}

/** Is `relation` from a `source` concept to a `target` concept permitted by the standard? */
export function isPermitted(source: string, relation: string, target: string): { ok: boolean; permitted: string[]; reason?: string } {
  const s = resolveConcept(source), t = resolveConcept(target);
  if (!s) return { ok: false, permitted: [], reason: `Unknown concept '${source}'.` };
  if (!t) return { ok: false, permitted: [], reason: `Unknown concept '${target}'.` };
  const rel = Object.keys(RELATIONSHIPS).find((k) => k.toLowerCase() === relation.toLowerCase().replace(/relationship$/, ""));
  if (!rel) return { ok: false, permitted: [], reason: `Unknown relationship '${relation}'.` };
  const letters = MATRIX[s.name]?.[t.name] ?? "";
  const permitted = Object.keys(RELATIONSHIPS).filter((k) => letters.includes(KEY_OF[k]));
  const ok = letters.includes(KEY_OF[rel]);
  return ok ? { ok, permitted } : { ok, permitted, reason: `${rel} is not permitted from ${s.name} to ${t.name}. Permitted: ${permitted.join(", ") || "none"}.` };
}

export interface Finding { relationship?: string; element?: string; problem: string }

/** Every element must have a known type; every relationship must join two known elements and be permitted. */
export function validateModel(model: Model): { ok: boolean; findings: Finding[]; stats: { elements: number; relationships: number } } {
  const findings: Finding[] = [];
  const ids = new Map(model.elements.map((e) => [e.id, e]));
  for (const e of model.elements) {
    if (!CONCEPT_BY_NAME[e.type]) findings.push({ element: e.id, problem: `Unknown concept type '${e.type}' on '${e.name}'.` });
  }
  for (const r of model.relationships) {
    const s = ids.get(r.source), t = ids.get(r.target);
    if (!s || !t) { findings.push({ relationship: r.id, problem: `Relationship ${r.id} points at a missing element (${!s ? r.source : r.target}).` }); continue; }
    const v = isPermitted(s.type, r.type, t.type);
    if (!v.ok) findings.push({ relationship: r.id, problem: `${s.name} → ${t.name}: ${v.reason}` });
  }
  return { ok: findings.length === 0, findings, stats: { elements: model.elements.length, relationships: model.relationships.length } };
}

// ---------------------------------------------------------------------------
// Open Exchange Format (ArchiMate Model Exchange File Format, 3.x schema)

const NS = "http://www.opengroup.org/xsd/archimate/3.0/";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ncname = (id: string) => (/^[A-Za-z_]/.test(id) ? id : "id-" + id).replace(/[^A-Za-z0-9_.-]/g, "-");

export function toExchangeXml(model: Model): string {
  const propKeys = Array.from(new Set(model.elements.flatMap((e) => Object.keys(e.properties ?? {}))));
  const propId = (k: string) => "propid-" + propKeys.indexOf(k);
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<model xmlns="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${NS} http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd" identifier="${ncname("model-" + slug(model.name))}">`);
  lines.push(`  <name xml:lang="en">${esc(model.name)}</name>`);
  if (model.documentation) lines.push(`  <documentation xml:lang="en">${esc(model.documentation)}</documentation>`);
  if (propKeys.length) {
    lines.push(`  <propertyDefinitions>`);
    for (const k of propKeys) lines.push(`    <propertyDefinition identifier="${propId(k)}" type="string"><name>${esc(k)}</name></propertyDefinition>`);
    lines.push(`  </propertyDefinitions>`);
  }
  lines.push(`  <elements>`);
  for (const e of model.elements) {
    lines.push(`    <element identifier="${ncname(e.id)}" xsi:type="${e.type}">`);
    lines.push(`      <name xml:lang="en">${esc(e.name)}</name>`);
    if (e.documentation) lines.push(`      <documentation xml:lang="en">${esc(e.documentation)}</documentation>`);
    const props = Object.entries(e.properties ?? {});
    if (props.length) {
      lines.push(`      <properties>`);
      for (const [k, v] of props) lines.push(`        <property propertyDefinitionRef="${propId(k)}"><value xml:lang="en">${esc(String(v))}</value></property>`);
      lines.push(`      </properties>`);
    }
    lines.push(`    </element>`);
  }
  lines.push(`  </elements>`);
  if (model.relationships.length) {
    lines.push(`  <relationships>`);
    for (const r of model.relationships) {
      const access = r.type === "Access" && r.accessType ? ` accessType="${r.accessType}"` : "";
      const open = `    <relationship identifier="${ncname(r.id)}" source="${ncname(r.source)}" target="${ncname(r.target)}" xsi:type="${r.type}"${access}>`;
      lines.push(r.name ? `${open}<name xml:lang="en">${esc(r.name)}</name></relationship>` : open.replace(/>$/, "/>"));
    }
    lines.push(`  </relationships>`);
  }
  lines.push(`</model>`);
  return lines.join("\n");
}

/** Read an exchange file back. Tolerant: takes what it recognises, ignores views and organisation. */
export function fromExchangeXml(xml: string): Model {
  const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const text = (block: string, tag: string) => { const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)); return m ? unesc(m[1].trim()) : undefined; };
  const nameOf = (block: string) => text(block, "name") ?? "";
  const model = emptyModel(nameOf(xml.split("<elements")[0] ?? "") || "Imported model");
  model.documentation = text(xml.split("<elements")[0] ?? "", "documentation");
  model.source = "imported from an ArchiMate exchange file";
  const propDefs: Record<string, string> = {};
  for (const m of xml.matchAll(/<propertyDefinition\b([^>]*)>([\s\S]*?)<\/propertyDefinition>/g)) {
    const id = attr(m[1], "identifier"); if (id) propDefs[id] = nameOf(m[2]);
  }
  for (const m of xml.matchAll(/<element\b([^>]*?)(?:\/>|>([\s\S]*?)<\/element>)/g)) {
    const head = m[1], body = m[2] ?? "";
    const type = attr(head, "xsi:type"); const id = attr(head, "identifier");
    if (!type || !id || !CONCEPT_BY_NAME[type]) continue;
    const properties: Record<string, string> = {};
    for (const p of body.matchAll(/<property\b([^>]*)>([\s\S]*?)<\/property>/g)) {
      const key = propDefs[attr(p[1], "propertyDefinitionRef") ?? ""]; const val = text(p[2], "value");
      if (key && val !== undefined) properties[key] = val;
    }
    model.elements.push({ id, type, name: nameOf(body), documentation: text(body, "documentation"), ...(Object.keys(properties).length ? { properties } : {}) });
  }
  for (const m of xml.matchAll(/<relationship\b([^>]*?)(?:\/>|>([\s\S]*?)<\/relationship>)/g)) {
    const head = m[1], body = m[2] ?? "";
    const type = attr(head, "xsi:type"); const id = attr(head, "identifier"); const source = attr(head, "source"); const target = attr(head, "target");
    if (!type || !id || !source || !target || !RELATIONSHIPS[type]) continue;
    const accessType = attr(head, "accessType") as Relationship["accessType"];
    model.relationships.push({ id, type, source, target, ...(nameOf(body) ? { name: nameOf(body) } : {}), ...(accessType ? { accessType } : {}) });
  }
  return model;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}

export function summarize(model: Model) {
  const byLayer: Record<string, number> = {};
  for (const e of model.elements) { const l = CONCEPT_BY_NAME[e.type]?.layer ?? "unknown"; byLayer[l] = (byLayer[l] ?? 0) + 1; }
  return { name: model.name, elements: model.elements.length, relationships: model.relationships.length, byLayer, source: model.source, generatedAt: model.generatedAt };
}
