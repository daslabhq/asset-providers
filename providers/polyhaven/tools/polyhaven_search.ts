// Search the Poly Haven CC0 library — body-style tool: reads ctx.input, returns a value.
//
// Poly Haven's listing endpoint has no query parameter, so the whole (small,
// cacheable) index for a kind is fetched and filtered here on slug + name +
// tags + categories. Self-contained by design: code tools cannot import shared
// modules yet, so the tiny API client is inlined per tool.
const API = "https://api.polyhaven.com";
const KINDS = ["hdris", "textures", "models"];
const ALIAS = { hdri: "hdris", hdris: "hdris", texture: "textures", textures: "textures", model: "models", models: "models" };

const input = ctx.input || {};
const query = String(input.query || "").toLowerCase().trim();
const category = input.category ? String(input.category) : "";
const limit = Math.min(Number(input.limit) || 20, 60);

let kinds = KINDS;
if (input.type && input.type !== "all") {
  const kind = ALIAS[String(input.type).toLowerCase()];
  if (!kind) throw new Error('Unknown type "' + input.type + '". Use hdris, textures, models, or all.');
  kinds = [kind];
}

async function list(kind) {
  const qs = new URLSearchParams(category ? { t: kind, c: category } : { t: kind });
  const resp = await fetch(API + "/assets?" + qs);
  if (!resp.ok) throw new Error("Poly Haven API " + resp.status + " listing " + kind);
  const data = await resp.json();
  return Object.entries(data || {}).map(([slug, meta]) => ({
    slug,
    name: (meta && meta.name) || slug,
    type: kind,
    tags: (meta && meta.tags) || [],
    categories: (meta && meta.categories) || [],
    authors: Object.keys((meta && meta.authors) || {}),
    max_resolution: (meta && meta.max_resolution) || null,
    thumbnail_url: "https://cdn.polyhaven.com/asset_img/thumbs/" + slug + ".png?height=180",
    page_url: "https://polyhaven.com/a/" + slug,
  }));
}

const found = [];
for (const kind of kinds) found.push(...(await list(kind)));

const terms = query.split(/\s+/).filter(Boolean);
const matches = terms.length
  ? found.filter((a) => {
      const hay = [a.slug, a.name].concat(a.tags, a.categories).join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
  : found;

return {
  total: matches.length,
  license: "CC0 — no attribution required, redistribution and rehosting allowed",
  assets: matches.slice(0, limit),
};
