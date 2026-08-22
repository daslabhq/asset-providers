import { request, collection, num } from "../lib/client";

export default async function (input: any, ctx: any) {
  const res = await request(ctx.credential, "/appointments", { query: { per_page: num(input.per_page) } });
  return collection(res, "appointments");
}
