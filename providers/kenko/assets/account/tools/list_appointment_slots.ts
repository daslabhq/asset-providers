import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, str, num } from "../../../lib/client";

export default defineTool({
  name: "kenko_list_appointment_slots",
  description: "List bookable time slots for one appointment product, scoped to an Instructor or a Facility. Spot counts reflect every booking at the center whatever channel made it, so this is the source of truth for appointment availability. Pass exactly one of user_id or facility_id.",
  readOnly: true,
  input: {
    "appointment_id": {
      "type": "string",
      "description": "Appointment product id from kenko_list_appointments"
    },
    "start_date": {
      "type": "string",
      "description": "Start of the range (YYYY-MM-DD). Required."
    },
    "end_date": {
      "type": "string",
      "description": "End of the range (YYYY-MM-DD). Must be >= start_date."
    },
    "user_id": {
      "type": "number",
      "description": "Instructor user id from kenko_list_bookables"
    },
    "facility_id": {
      "type": "number",
      "description": "Facility id from kenko_list_bookables"
    },
    "dates_only": {
      "type": "boolean",
      "description": "Return only the dates that have availability, no slot times"
    }
  },
  required: ["appointment_id","start_date"],
  async run(input: any, ctx: any) {
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
  },
});
