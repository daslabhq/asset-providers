import { request, unwrap, decodeBooking, str, num } from "../lib/client";

export default async function (input: any, ctx: any) {
  const { data, meta } = unwrap(
    await request(ctx.credential, "/bookings", {
      query: {
        start_date: str(input.start_date),
        end_date: str(input.end_date),
        event_type: str(input.event_type),
        per_page: num(input.per_page),
      },
    }),
  );
  const bookings = Array.isArray(data) ? data.map(decodeBooking) : data;
  return { bookings, total: meta?.total ?? (Array.isArray(data) ? data.length : 0) };
}
