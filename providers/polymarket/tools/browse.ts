// role:"browse" tool — feeds the asset picker, not the LLM.
//
// Input: { type, search, parentId }. Events list at the top; a specific
// event's markets list under it via parentId. Metadata keys mirror the
// fields declared on the asset types.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};
const type = String(input.type || "");
const query = String(input.search || "").trim().toLowerCase();
const parentId = String(input.parentId || "").trim();

function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}
function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + "..." : s || "";
}
function priceDisplay(m) {
  try {
    const outcomes = JSON.parse(m.outcomes || "[]");
    const prices = JSON.parse(m.outcomePrices || "[]");
    return outcomes
      .map((o, i) => o + ": " + (prices[i] != null ? (parseFloat(prices[i]) * 100).toFixed(1) + "%" : "N/A"))
      .join(", ");
  } catch {
    return "";
  }
}
function marketItem(m, parent) {
  return {
    id: m.id,
    name: m.question,
    description: priceDisplay(m),
    ...(parent ? { parentId: parent } : {}),
    metadata: {
      slug: m.slug,
      prices: priceDisplay(m),
      volume: dollars(m.volumeNum != null ? m.volumeNum : m.volume),
      liquidity: dollars(m.liquidityNum != null ? m.liquidityNum : m.liquidity),
      end_date: m.endDate || "",
      url: "https://polymarket.com/event/" + m.slug,
    },
  };
}

if (type === "event") {
  const url = new URL(API + "/events");
  url.searchParams.set("limit", "50");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("order", "volume");
  url.searchParams.set("ascending", "false");
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Polymarket API " + resp.status + " listing events");
  const events = await resp.json();
  const matches = query
    ? events.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(query) || (e.slug || "").toLowerCase().includes(query),
      )
    : events;
  return {
    items: matches.slice(0, 40).map((e) => ({
      id: e.id,
      name: e.title,
      description: truncate(e.description, 150),
      metadata: {
        slug: e.slug,
        volume: dollars(e.volume),
        liquidity: dollars(e.liquidity),
        market_count: String((e.markets || []).length),
        end_date: e.endDate || "",
        tags: (e.tags || []).map((t) => t.label).join(", "),
        url: "https://polymarket.com/event/" + e.slug,
      },
    })),
  };
}

if (type === "market") {
  if (parentId) {
    const resp = await fetch(API + "/events/" + encodeURIComponent(parentId));
    if (!resp.ok) throw new Error("Polymarket API " + resp.status + " fetching event " + parentId);
    const event = await resp.json();
    const sorted = (event.markets || []).sort(
      (a, b) =>
        (b.volumeNum != null ? b.volumeNum : parseFloat(b.volume || "0")) -
        (a.volumeNum != null ? a.volumeNum : parseFloat(a.volume || "0")),
    );
    return { items: sorted.slice(0, 40).map((m) => marketItem(m, parentId)) };
  }
  const url = new URL(API + "/markets");
  url.searchParams.set("limit", "50");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("order", "volume");
  url.searchParams.set("ascending", "false");
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Polymarket API " + resp.status + " listing markets");
  const markets = await resp.json();
  const matches = query
    ? markets.filter((m) => (m.question || "").toLowerCase().includes(query))
    : markets;
  return { items: matches.slice(0, 40).map((m) => marketItem(m)) };
}

return { items: [] };
