import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, decodeBooking, str, num } from "../../../lib/client";

export default defineTool({
  description: "List reservations at the connected center — classes and appointments, from every booking channel including the Kenko CRM and webstore, not just this partner's. Use it as the single picture of what is booked at the studio. Note the asymmetry: reads span all channels, but create and cancel only reach this partner's own bookings.",
  readOnly: true,
  input: {
    "start_date": {
      "type": "string",
      "description": "Events starting on or after this date (YYYY-MM-DD)"
    },
    "end_date": {
      "type": "string",
      "description": "Events starting on or before this date (YYYY-MM-DD)"
    },
    "event_type": {
      "type": "string",
      "description": "Filter to one kind of event",
      "enum": [
        "class",
        "appointment"
      ]
    },
    "per_page": {
      "type": "number",
      "description": "Page size, 1-100 (default 50)"
    }
  },
  async run(input: any, ctx: any) {
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
  },
});
