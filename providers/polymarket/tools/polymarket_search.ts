// Keyword search over events. The Gamma API has no search endpoint, so this
// fetches the top events and filters on title, description, and slug.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};
const query = String(input.query || "").toLowerCase().trim();
if (!query) throw new Error("query is required");
const limit = Math.min(Number(input.limit) || 25, 100);

const url = new URL(API + "/events");
url.searchParams.set("limit", "100");
url.searchParams.set("active", String(input.active !== false));
url.searchParams.set("order", "volume");
url.searchParams.set("ascending", "false");

const resp = await fetch(url);
if (!resp.ok) throw new Error("Polymarket API " + resp.status + " listing events");
const events = await resp.json();

const matches = events.filter(
  (e) =>
    (e.title || "").toLowerCase().includes(query) ||
    (e.description || "").toLowerCase().includes(query) ||
    (e.slug || "").toLowerCase().includes(query),
);

function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}
function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + "..." : s || "";
}

return {
  query,
  resultCount: matches.length,
  events: matches.slice(0, limit).map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    description: truncate(e.description, 200),
    marketCount: (e.markets || []).length,
    volume: dollars(e.volume),
    active: e.active,
    url: "https://polymarket.com/event/" + e.slug,
  })),
};
