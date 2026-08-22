import { request, unwrap, decodeBooking, normalizeBookable, toCustomer, str } from "../lib/client";

// One endpoint, two body shapes. Kenko rejects a body carrying both
// schedule_id and appointment_id, and an appointment needs a slot time plus
// at least one bookable — so the branch is guarded here.
export default async function (input: any, ctx: any) {
  const scheduleId = str(input.schedule_id);
  const appointmentId = str(input.appointment_id);
  const externalReferenceId = str(input.external_reference_id);
  if (!externalReferenceId) throw new Error("external_reference_id is required — it is the idempotency key.");

  if (scheduleId && appointmentId) throw new Error("Pass schedule_id for a class or appointment_id for an appointment, not both.");
  if (!scheduleId && !appointmentId) throw new Error("Either schedule_id (class) or appointment_id (appointment) is required.");
  if (appointmentId && !str(input.starts_at)) {
    throw new Error("starts_at is required for an appointment booking — take it from kenko_list_appointment_slots.");
  }
  const bookables = Array.isArray(input.bookables) ? input.bookables : [];
  if (appointmentId && bookables.length === 0) {
    throw new Error("At least one bookable (Instructor or Facility) is required for an appointment booking.");
  }

  const customer = toCustomer(input.customer);
  if (!customer.email) throw new Error("customer.email is required.");

  const body: Record<string, unknown> = { external_reference_id: externalReferenceId, customer };
  if (scheduleId) {
    body.schedule_id = scheduleId;
  } else {
    body.appointment_id = appointmentId;
    body.starts_at = str(input.starts_at);
    body.bookables = bookables.map(normalizeBookable);
  }

  return decodeBooking(unwrap(await request(ctx.credential, "/bookings", { method: "POST", body })).data);
}
