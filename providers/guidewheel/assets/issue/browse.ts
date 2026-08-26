import { defineBrowse } from "@daslabhq/asset-provider";
import { read, asArray, type GuidewheelCredential } from "../../lib/client";

// role:"browse" — recent downtime issues for the asset picker.
// Issues are time-range scoped and have no server-side search, so this reads
// the last 7 days and filters locally.
// Metadata keys mirror the fields declared in issue/asset.json.
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default defineBrowse(async ({ search }, ctx: { credential: GuidewheelCredential }) => {
  const now = Date.now();
  const rows = asArray(await read(ctx.credential, "/issues", { from_ts: now - WINDOW_MS, to_ts: now }));
  const needle = String(search || "").trim().toLowerCase();

  return {
    items: rows
      .map((row) => {
        const device = String(row.deviceid ?? "");
        const reason = reasonOf(row);
        const title = [device || "Machine", row.comments?.action || "issue"].join(" ");
        return {
          id: String(row.id ?? ""),
          name: title,
          description: [reason, row.status].filter(Boolean).join(" · ") || undefined,
          metadata: {
            title,
            status: String(row.status ?? ""),
            reason,
            device,
          },
        };
      })
      .filter((item) => !needle || `${item.name} ${item.description ?? ""}`.toLowerCase().includes(needle)),
  };
});

/** The operator-selected downtime reason lives on the first tag. */
function reasonOf(row: Record<string, any>): string {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return String(tags[0]?.tagname ?? "");
}
