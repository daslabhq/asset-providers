import { request, unwrap, decodeBooking, str } from "../lib/client";

// Accepts the Kenko numeric booking id or the external_reference_id you booked with.
export default async function (input: any, ctx: any) {
  const id = str(input.booking_id);
  if (!id) throw new Error("booking_id is required.");
  return decodeBooking(unwrap(await request(ctx.credential, `/bookings/${encodeURIComponent(id)}`, { method: "DELETE" })).data);
}
