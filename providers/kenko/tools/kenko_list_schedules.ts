import { request, collection, str, num } from "../lib/client";

export default async function (input: any, ctx: any) {
  const res = await request(ctx.credential, "/schedules", {
    query: {
      start_date: str(input.start_date),
      end_date: str(input.end_date),
      page: num(input.page),
      per_page: num(input.per_page),
    },
  });
  return collection(res, "schedules");
}
