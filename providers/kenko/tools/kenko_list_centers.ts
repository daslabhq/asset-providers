import { request, unwrap } from "../lib/client";

export default async function (_input: any, ctx: any) {
  return unwrap(await request(ctx.credential, "/centers")).data;
}
