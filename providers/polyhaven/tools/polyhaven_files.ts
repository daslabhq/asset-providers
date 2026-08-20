// Resolve download URLs for one Poly Haven slug at a resolution.
//
// The /files tree is shaped differently per asset kind (hdri / texture set /
// model geometry) — this flattens all three into one shape. Defaults are
// web-sized: 1k HDR and 2k JPG; image-based lighting prefilters the HDRI
// anyway, so higher buys little outside offline rendering.
const API = "https://api.polyhaven.com";
const KINDS = ["hdris", "textures", "models"];
const ALIAS = { hdri: "hdris", hdris: "hdris", texture: "textures", textures: "textures", model: "models", models: "models" };

// Poly Haven's map key → normalised name. `nor_gl` is the OpenGL-convention
// normal map, which is what WebGL/three.js expects (nor_dx is for DirectX).
const TEXTURE_MAP_KEYS = {
  diffuse: ["Diffuse", "diff", "albedo", "Color"],
  normal: ["nor_gl"],
  roughness: ["Rough", "rough", "roughness"],
  ao: ["AO", "ao"],
  displacement: ["Displacement", "disp", "height"],
  arm: ["arm"],
};

const USAGE = {
  hdris:
    "Use as scene.environment for image-based lighting (prefilter with PMREMGenerator). Pair with ACESFilmic tone mapping and sRGB output, or the result looks washed out. 1k is plenty on web — IBL blurs it anyway.",
  textures:
    "PBR set. Prefer the packed `arm` map (AO+Roughness+Metallic in one image) over separate ao/roughness on web — one fetch instead of three. `normal` is the OpenGL-convention map, which is what WebGL expects.",
  models:
    "glTF is multi-file: mirror `gltf.includes` alongside the main file, preserving relative paths, or the model loads without its .bin and textures. USD and FBX are also published.",
};

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

const tree = await get("/files/" + slug);
const resolution = input.resolution ? String(input.resolution) : kind === "hdris" ? "1k" : "2k";

function toFile(entry) {
  if (!entry || !entry.url) return undefined;
  const file = { url: entry.url, size: entry.size ?? null, md5: entry.md5 ?? null };
  // glTF is multi-file: the .gltf references a .bin and texture images by
  // relative path. Mirroring the main file alone yields a broken model.
  if (entry.include && typeof entry.include === "object") {
    file.includes = Object.entries(entry.include).map(([path, inc]) => ({
      path,
      url: inc && inc.url,
      size: (inc && inc.size) ?? null,
    }));
  }
  return file;
}

const availableResolutions = new Set();
for (const group of Object.values(tree || {})) {
  if (group && typeof group === "object") {
    for (const key of Object.keys(group)) if (/^\d+k$/.test(key)) availableResolutions.add(key);
  }
}

const out = {
  slug,
  kind,
  resolution,
  availableResolutions: [...availableResolutions].sort((a, b) => parseInt(a) - parseInt(b)),
  license: "CC0",
  usage: USAGE[kind],
};

if (kind === "hdris") {
  const at = tree && tree.hdri && tree.hdri[resolution];
  const format = String(input.format || "hdr");
  out.hdri = toFile(at && (at[format] || at.hdr || at.exr));
}

if (kind === "textures") {
  const format = String(input.format || "jpg");
  const maps = {};
  for (const [name, candidates] of Object.entries(TEXTURE_MAP_KEYS)) {
    const key = candidates.find((k) => tree && tree[k] && tree[k][resolution]);
    if (!key) continue;
    const at = tree[key][resolution];
    const file = toFile(at && (at[format] || at.jpg || at.png || at.exr));
    if (file) maps[name] = file;
  }
  out.maps = maps;
}

if (kind === "models") {
  out.gltf = toFile(tree && tree.gltf && tree.gltf[resolution] && tree.gltf[resolution].gltf);
  out.usd = toFile(tree && tree.usd && tree.usd[resolution] && tree.usd[resolution].usd);
  out.fbx = toFile(tree && tree.fbx && tree.fbx[resolution] && tree.fbx[resolution].fbx);
}

return out;
