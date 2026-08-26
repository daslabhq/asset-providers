import { defineBrowse } from "@daslabhq/asset-provider";
import { read, asArray, asKeyedSeries, type GuidewheelCredential } from "../../lib/client";

// role:"browse" — feeds the asset picker with the tenant's machines.
// Two calls: the device roster, plus one fleet-wide load-states read so each
// row shows the state it was last in. Guidewheel has no server-side device
// search or paging, so the search term filters locally.
// Metadata keys mirror the fields declared in device/asset.json.
const RECENT_MS = 2 * 60 * 60 * 1000;

export default defineBrowse(async ({ search }, ctx: { credential: GuidewheelCredential }) => {
  const now = Date.now();
  const [roster, states] = await Promise.all([
    read(ctx.credential, "/devices").then(asArray),
    read(ctx.credential, "/devices/loadStates", { from_ts: now - RECENT_MS, to_ts: now })
      .then(asKeyedSeries)
      .catch(() => ({}) as Record<string, Array<Record<string, any>>>),
  ]);

  const needle = String(search || "").trim().toLowerCase();
  const matches = needle
    ? roster.filter((row) => `${row.deviceid ?? ""} ${row.nickname ?? ""}`.toLowerCase().includes(needle))
    : roster;

  return {
    items: matches.map((row) => {
      const deviceId = String(row.deviceid ?? "");
      const name = String(row.nickname || deviceId || "Machine");
      const state = latestState(states[deviceId]);
      return {
        id: deviceId,
        name,
        description: [state, row.target ? `target ${row.target}%` : ""].filter(Boolean).join(" · ") || undefined,
        metadata: {
          name,
          device_id: deviceId,
          state,
          target: String(row.target ?? ""),
        },
      };
    }),
  };
});

/** Load states come back as contiguous spans; the last one is the current state. */
function latestState(spans: Array<Record<string, any>> | undefined): string {
  if (!Array.isArray(spans) || spans.length === 0) return "";
  const last = spans.reduce((a, b) => (Number(b.end ?? 0) > Number(a.end ?? 0) ? b : a));
  return String(last.state ?? "");
}
