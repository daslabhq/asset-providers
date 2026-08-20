// List markets from the Gamma API, shaped for reading: outcome prices as
// percentages, volume and liquidity as dollar strings.
const API = "https://gamma-api.polymarket.com";
const input = ctx.input || {};

const url = new URL(API + "/markets");
url.searchParams.set("limit", String(Math.min(Number(input.limit) || 25, 100)));
url.searchParams.set("offset", String(Number(input.offset) || 0));
url.searchParams.set("active", String(input.active !== false));
url.searchParams.set("closed", String(input.closed === true));
url.searchParams.set("order", String(input.order || "volume"));
url.searchParams.set("ascending", "false");

const resp = await fetch(url);
if (!resp.ok) throw new Error("Polymarket API " + resp.status + " listing markets");
const markets = await resp.json();

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
function dollars(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}

return markets.map((m) => ({
  id: m.id,
  question: m.question,
  slug: m.slug,
  prices: priceDisplay(m),
  volume: dollars(m.volumeNum != null ? m.volumeNum : m.volume),
  liquidity: dollars(m.liquidityNum != null ? m.liquidityNum : m.liquidity),
  active: m.active,
  closed: m.closed,
  endDate: m.endDate,
  url: "https://polymarket.com/event/" + m.slug,
}));
