// role:"browse" tool — feeds the asset picker, not the LLM.
//
// Input: { type, search }. With a search term it geocodes it; with none it
// shows a handful of well-known cities so the picker is never empty.
// Metadata keys mirror the `fields` declared on the location asset type.
const API = "https://geocoding-api.open-meteo.com/v1/search";
const DEFAULTS = ["Berlin", "Bangkok", "New York", "Tokyo", "London", "São Paulo"];

const input = ctx.input || {};
if (String(input.type || "") !== "location") return { items: [] };
const query = String(input.search || "").trim();

async function geocode(name, count) {
  const url = new URL(API);
  url.searchParams.set("name", name);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Open-Meteo geocoding " + resp.status + " for " + name);
  const data = await resp.json();
  return data.results || [];
}

function item(r) {
  const region = [r.admin1, r.country].filter(Boolean).join(", ");
  return {
    id: String(r.id),
    name: r.name,
    description: region,
    metadata: {
      name: r.name,
      country: r.country || "",
      latitude: String(r.latitude),
      longitude: String(r.longitude),
      timezone: r.timezone || "",
    },
  };
}

if (query) {
  return { items: (await geocode(query, 20)).map(item) };
}

const lists = await Promise.all(DEFAULTS.map((name) => geocode(name, 1)));
return { items: lists.flat().map(item) };
