// One market in full: description, per-outcome prices, dates, resolution source.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};
const id = String(input.market_id || "").trim();
if (!id) throw new Error("market_id is required (a Polymarket market ID or slug)");

const resp = await fetch(API + "/markets/" + encodeURIComponent(id));
if (!resp.ok) throw new Error("Polymarket API " + resp.status + " fetching market " + id);
const m = await resp.json();

let outcomes = [];
let prices = [];
try {
  outcomes = JSON.parse(m.outcomes || "[]");
  prices = JSON.parse(m.outcomePrices || "[]");
} catch {}

function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}

return {
  id: m.id,
  question: m.question,
  slug: m.slug,
  description: m.description,
  outcomes: outcomes.map((o, i) => ({
    outcome: o,
    price: prices[i] != null ? (parseFloat(prices[i]) * 100).toFixed(1) + "%" : "N/A",
  })),
  volume: dollars(m.volumeNum != null ? m.volumeNum : m.volume),
  liquidity: dollars(m.liquidityNum != null ? m.liquidityNum : m.liquidity),
  active: m.active,
  closed: m.closed,
  startDate: m.startDate,
  endDate: m.endDate,
  resolutionSource: m.resolutionSource,
  url: "https://polymarket.com/event/" + m.slug,
};
