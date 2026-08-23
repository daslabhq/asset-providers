import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, decodeBooking, normalizeBookable, toCustomer, str } from "../../../lib/client";

// One endpoint, two body shapes. Kenko rejects a body carrying both
// schedule_id and appointment_id, and an appointment needs a slot time plus
// at least one bookable — so the branch is guarded here.
export default defineTool({
  name: "kenko_create_booking",
  description: "Book a customer into a public class or an appointment slot. Pass schedule_id for a class, or appointment_id + starts_at + bookables for an appointment — never both. external_reference_id is your own booking id and acts as the idempotency key: repeating it returns the existing booking instead of double-booking, so a retry after a network error is safe. Payment is recorded as settled externally.",
  requiresApproval: true,
  input: {
    "external_reference_id": {
      "type": "string",
      "description": "Your unique booking id, max 255 chars (e.g. your order id). Idempotency key — reused values return the existing booking."
    },
    "customer": {
      "type": "object",
      "description": "The customer to book. Resolved find-or-create by email — an existing contact at the center is reused, never duplicated.",
      "properties": {
        "email": {
          "type": "string",
          "description": "Lookup key. Required."
        },
        "first_name": {
          "type": "string",
          "description": "Defaults to the email local-part when creating"
        },
        "last_name": {
          "type": "string",
          "description": "Defaults to empty when creating"
        },
        "phone": {
          "type": "string",
          "description": "Optional, max 50 characters"
        }
      },
      "required": [
        "email"
      ]
    },
    "schedule_id": {
      "type": "string",
      "description": "Class booking: the event UUID from kenko_list_schedules"
    },
    "appointment_id": {
      "type": "string",
      "description": "Appointment booking: the product id from kenko_list_appointments"
    },
    "starts_at": {
      "type": "string",
      "description": "Appointment booking: ISO-8601 start that matches an available slot from kenko_list_appointment_slots"
    },
    "bookables": {
      "type": "array",
      "description": "Appointment booking: at least one Instructor and/or Facility to reserve",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "description": "instructor or facility",
            "enum": [
              "instructor",
              "facility"
            ]
          },
          "bookable_id": {
            "type": "string",
            "description": "Instructor user id or facility id from kenko_list_bookables"
          }
        },
        "required": [
          "type",
          "bookable_id"
        ]
      }
    }
  },
  required: ["external_reference_id","customer"],
  async run(input: any, ctx: any) {
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
  },
});
