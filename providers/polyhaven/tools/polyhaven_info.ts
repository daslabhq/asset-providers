// Full metadata for one Poly Haven asset. Download URLs live in polyhaven_files.
const API = "https://api.polyhaven.com";
const KINDS = ["hdris", "textures", "models"];
const ALIAS = { hdri: "hdris", hdris: "hdris", texture: "textures", textures: "textures", model: "models", models: "models" };

const input = ctx.input || {};
const slug = String(input.slug || "").trim();
if (!slug) throw new Error("slug is required, e.g. 'aircraft_workshop_01' or 'brushed_concrete'");

async function get(path) {
  const resp = await fetch(API + path);
  if (!resp.ok) throw new Error("Poly Haven API " + resp.status + " on " + path);
  return resp.json();
}

let kind;
if (input.type && input.type !== "all") {
  kind = ALIAS[String(input.type).toLowerCase()];
  if (!kind) throw new Error('Unknown type "' + input.type + '". Use hdris, textures, or models.');
} else {
  for (const k of KINDS) {
    const listing = await get("/assets?t=" + k);
    if (listing && Object.prototype.hasOwnProperty.call(listing, slug)) { kind = k; break; }
  }
  if (!kind) throw new Error('No Poly Haven asset "' + slug + '" in hdris, textures, or models.');
}

const meta = await get("/info/" + slug);

return {
  slug,
  name: (meta && meta.name) || slug,
  kind,
  tags: (meta && meta.tags) || [],
  categories: (meta && meta.categories) || [],
  authors: Object.keys((meta && meta.authors) || {}),
  max_resolution: (meta && meta.max_resolution) || null,
  date_published: meta && meta.date_published != null ? meta.date_published : null,
  thumbnail_url: "https://cdn.polyhaven.com/asset_img/thumbs/" + slug + ".png?height=180",
  page_url: "https://polyhaven.com/a/" + slug,
  license: "CC0",
};
