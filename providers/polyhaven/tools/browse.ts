// role:"browse" tool — feeds the asset picker, not the LLM.
//
// Input: { type, search } where type is the bare asset-type id declared in
// provider.json ("hdri" | "texture" | "model"). Returns a BrowseResult-shaped
// object: { items: [{ id, name, description, metadata }] }. The metadata keys
// become the pinned asset's fields, so they mirror the `fields` declared on
// the asset types.
const API = "https://api.polyhaven.com";
const KIND_BY_TYPE = { hdri: "hdris", texture: "textures", model: "models" };

const input = ctx.input || {};
const kind = KIND_BY_TYPE[String(input.type || "")];
if (!kind) return { items: [] };

const resp = await fetch(API + "/assets?t=" + kind);
if (!resp.ok) throw new Error("Poly Haven API " + resp.status + " listing " + kind);
const data = await resp.json();

const all = Object.entries(data || {}).map(([slug, meta]) => {
  const tags = (meta && meta.tags) || [];
  return {
    id: slug,
    name: (meta && meta.name) || slug,
    description: tags.slice(0, 6).join(", "),
    metadata: {
      slug,
      asset_kind: kind,
      tags: tags.join(", "),
      authors: Object.keys((meta && meta.authors) || {}).join(", "),
      max_resolution: ((meta && meta.max_resolution) || []).join("×"),
      thumbnail_url: "https://cdn.polyhaven.com/asset_img/thumbs/" + slug + ".png?height=180",
      page_url: "https://polyhaven.com/a/" + slug,
    },
  };
});

const query = String(input.search || "").trim().toLowerCase();
const terms = query.split(/\s+/).filter(Boolean);
const matches = terms.length
  ? all.filter((a) => {
      const hay = (a.id + " " + a.name + " " + a.metadata.tags).toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
  : all;

return { items: matches.slice(0, 40) };
