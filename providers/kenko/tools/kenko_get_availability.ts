import { request, unwrap } from "../lib/client";

// Kenko has no date filter here: unscoped, this returns every public schedule
// at the center. Pass schedule_ids whenever you can.
export default async function (input: any, ctx: any) {
  const ids = Array.isArray(input.schedule_ids) ? input.schedule_ids.map(String) : [];
  const res = await request(ctx.credential, "/availability", {
    query: { schedule_ids: ids.length ? ids.join(",") : undefined },
  });
  return unwrap(res).data;
}
