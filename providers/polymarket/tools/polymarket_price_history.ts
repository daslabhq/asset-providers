// Price history for one market: fetch the market for its CLOB token ids, then
// pull each outcome's timestamped prices from the CLOB API.
const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const input = ctx.input || {};
const id = String(input.market_id || "").trim();
if (!id) throw new Error("market_id is required (a Polymarket market ID or slug)");
const interval = String(input.interval || "1w");
const fidelity = Number(input.fidelity) || 60;

const marketResp = await fetch(GAMMA + "/markets/" + encodeURIComponent(id));
if (!marketResp.ok) throw new Error("Polymarket API " + marketResp.status + " fetching market " + id);
const market = await marketResp.json();

let outcomes = [];
let tokenIds = [];
try {
  outcomes = JSON.parse(market.outcomes || "[]");
  tokenIds = JSON.parse(market.clobTokenIds || "[]");
} catch {}
if (tokenIds.length === 0) {
  throw new Error("Market " + id + " has no order book, so price history is not available.");
}

const history = await Promise.all(
  tokenIds.map(async (tokenId, index) => {
    const url = new URL(CLOB + "/prices-history");
    url.searchParams.set("market", tokenId);
    url.searchParams.set("interval", interval);
    url.searchParams.set("fidelity", String(fidelity));
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Polymarket CLOB API " + resp.status + " for token " + tokenId);
    const data = ((await resp.json()).history || []);
    return { outcome: outcomes[index] || "Outcome " + (index + 1), data };
  }),
);

function pct(p) {
  return (p * 100).toFixed(1) + "%";
}

return {
  market: { id: market.id, question: market.question, outcomes },
  timeRange: interval,
  fidelityMinutes: fidelity,
  outcomes: history.map((h) => ({
    outcome: h.outcome,
    dataPoints: h.data.length,
    latestPrice: h.data.length > 0 ? pct(h.data[h.data.length - 1].p) : "N/A",
    priceChange:
      h.data.length >= 2 ? ((h.data[h.data.length - 1].p - h.data[0].p) * 100).toFixed(1) + "pp" : "N/A",
    recentPrices: h.data.slice(-10).map((p) => ({
      timestamp: new Date(p.t * 1000).toISOString(),
      probability: pct(p.p),
    })),
    fullHistory: h.data.map((p) => ({ t: p.t, p: Math.round(p.p * 1000) / 1000 })),
  })),
};
