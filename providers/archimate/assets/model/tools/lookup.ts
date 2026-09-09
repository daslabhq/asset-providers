import { defineTool } from "@daslabhq/asset-provider";
import { CONCEPTS, LAYERS, RELATIONSHIPS, resolveConcept } from "../../../lib/concepts";

export default defineTool({
  name: "archimate_lookup",
  description: "Find the right ArchiMate concept for a thing, or list the concepts of a layer. Pass a rough name ('app component', 'a machine that does work', 'node') or a layer ('business', 'technology', 'motivation'). Returns concept names with layer, aspect and a one-line meaning, and the relationship kinds when asked for 'relationships'.",
  readOnly: true,
  input: {
    query: { type: "string", description: "A concept name, a layer name, a plain description of a thing, or 'relationships'" },
  },
  required: ["query"],
  async run(input: { query: string }) {
    const q = String(input.query ?? "").trim();
    if (/^relation/i.test(q)) return { relationships: Object.entries(RELATIONSHIPS).map(([name, r]) => ({ name, kind: r.kind, meaning: r.meaning })) };
    const exact = resolveConcept(q);
    if (exact) return { match: exact, note: "Exact concept." };
    const layer = Object.keys(LAYERS).find((l) => l === q.toLowerCase() || LAYERS[l as keyof typeof LAYERS].label.toLowerCase() === q.toLowerCase());
    if (layer) return { layer, concepts: CONCEPTS.filter((c) => c.layer === layer) };
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const scored = CONCEPTS.map((c) => ({ c, score: words.filter((w) => (c.name + " " + c.meaning).toLowerCase().includes(w)).length })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    return { candidates: scored.map((x) => x.c), note: scored.length ? "Ranked by overlap with the meaning text. Pick one, then archimate_check the relationship you intend." : "No overlap. Try a layer name to list its concepts." };
  },
});
