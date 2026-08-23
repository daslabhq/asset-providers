import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap } from "../../../lib/client";

// Kenko has no date filter here: unscoped, this returns every public schedule
// at the center. Pass schedule_ids whenever you can.
export default defineTool({
  name: "kenko_get_availability",
  description: "Refresh remaining spots for class sessions without re-fetching full schedule payloads. Pass the schedule ids you care about — Kenko has no date filter here, so an unscoped call returns every public schedule at the center and can be large.",
  readOnly: true,
  input: {
    "schedule_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Event UUIDs to check. Strongly preferred over omitting."
    }
  },
  async run(input: any, ctx: any) {
    const ids = Array.isArray(input.schedule_ids) ? input.schedule_ids.map(String) : [];
    const res = await request(ctx.credential, "/availability", {
      query: { schedule_ids: ids.length ? ids.join(",") : undefined },
    });
    return unwrap(res).data;
  },
});
