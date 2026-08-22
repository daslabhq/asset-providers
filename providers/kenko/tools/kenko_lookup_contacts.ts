import { request, unwrap, str, num } from "../lib/client";

export default async function (input: any, ctx: any) {
  const query = str(input.query);
  if (!query) throw new Error("query is required.");
  const res = await request(ctx.credential, "/contacts", { query: { query, limit: num(input.limit) } });
  return unwrap(res).data;
}
