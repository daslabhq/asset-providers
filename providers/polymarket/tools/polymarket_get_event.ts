// One event in full, including all its markets with current outcome prices.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};
const id = String(input.event_id || "").trim();
if (!id) throw new Error("event_id is required (a Polymarket event ID or slug)");

const resp = await fetch(API + "/events/" + encodeURIComponent(id));
if (!resp.ok) throw new Error("Polymarket API " + resp.status + " fetching event " + id);
const e = await resp.json();

function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}

return {
  id: e.id,
  title: e.title,
  slug: e.slug,
  description: e.description,
  volume: dollars(e.volume),
  liquidity: dollars(e.liquidity),
  active: e.active,
  closed: e.closed,
  startDate: e.startDate,
  endDate: e.endDate,
  tags: (e.tags || []).map((t) => t.label),
  url: "https://polymarket.com/event/" + e.slug,
  markets: (e.markets || []).map((m) => {
    let outcomes = [];
    let prices = [];
    try {
      outcomes = JSON.parse(m.outcomes || "[]");
      prices = JSON.parse(m.outcomePrices || "[]");
    } catch {}
    return {
      id: m.id,
      question: m.question,
      outcomes: outcomes.map((o, i) => ({
        outcome: o,
        price: prices[i] != null ? (parseFloat(prices[i]) * 100).toFixed(1) + "%" : "N/A",
      })),
      volume: dollars(m.volumeNum != null ? m.volumeNum : m.volume),
      active: m.active,
      closed: m.closed,
    };
  }),
};
