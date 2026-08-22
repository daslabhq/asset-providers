import { request, unwrap, str, num } from "../lib/client";

export default async function (input: any, ctx: any) {
  const appointmentId = str(input.appointment_id);
  const startDate = str(input.start_date);
  if (!appointmentId || !startDate) throw new Error("appointment_id and start_date are required.");

  const present = ["user_id", "facility_id"].filter((k) => input[k] !== undefined && input[k] !== null && input[k] !== "");
  if (present.length !== 1) throw new Error("Pass exactly one of user_id or facility_id.");

  const res = await request(ctx.credential, `/appointments/${encodeURIComponent(appointmentId)}/slots`, {
    query: {
      start_date: startDate,
      end_date: str(input.end_date),
      user_id: num(input.user_id),
      facility_id: num(input.facility_id),
      dates_only: input.dates_only,
    },
  });
  return unwrap(res).data;
}
