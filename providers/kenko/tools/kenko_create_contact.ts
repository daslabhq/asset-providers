import { request, unwrap, toCustomer } from "../lib/client";

// Find-or-create by email: an existing contact is returned, never duplicated.
export default async function (input: any, ctx: any) {
  const customer = toCustomer(input);
  if (!customer.email) throw new Error("email is required.");
  return unwrap(await request(ctx.credential, "/contacts", { method: "POST", body: customer })).data;
}
