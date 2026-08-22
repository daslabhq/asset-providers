import { request, unwrap, str } from "../lib/client";

export default async function (input: any, ctx: any) {
  const id = str(input.schedule_id);
  if (!id) throw new Error("schedule_id is required.");
  return unwrap(await request(ctx.credential, `/schedules/${encodeURIComponent(id)}`)).data;
}
