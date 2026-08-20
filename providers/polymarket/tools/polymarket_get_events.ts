// List events: groups of related markets, summarized one line each.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};

const url = new URL(API + "/events");
url.searchParams.set("limit", String(Math.min(Number(input.limit) || 25, 100)));
url.searchParams.set("offset", String(Number(input.offset) || 0));
url.searchParams.set("active", String(input.active !== false));
url.searchParams.set("closed", String(input.closed === true));
url.searchParams.set("order", String(input.order || "volume"));
url.searchParams.set("ascending", "false");

const resp = await fetch(url);
if (!resp.ok) throw new Error("Polymarket API " + resp.status + " listing events");
const events = await resp.json();

function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}
function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + "..." : s || "";
}

return events.map((e) => ({
  id: e.id,
  title: e.title,
  slug: e.slug,
  description: truncate(e.description, 200),
  marketCount: (e.markets || []).length,
  volume: dollars(e.volume),
  liquidity: dollars(e.liquidity),
  active: e.active,
  closed: e.closed,
  startDate: e.startDate,
  endDate: e.endDate,
  tags: (e.tags || []).map((t) => t.label),
  url: "https://polymarket.com/event/" + e.slug,
}));
