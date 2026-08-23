import { defineTool } from "@daslabhq/asset-provider";
import { request, collection, str, num } from "../../../lib/client";

export default defineTool({
  description: "List public class sessions available for partner booking, ordered by start date. Returns capacity and remaining spots per session. Only classes the studio marked public for partners appear here; booked appointments never do — use kenko_list_bookings for those.",
  readOnly: true,
  input: {
    "start_date": {
      "type": "string",
      "description": "Include sessions starting on or after this date (YYYY-MM-DD)"
    },
    "end_date": {
      "type": "string",
      "description": "Include sessions starting on or before this date (YYYY-MM-DD). Must be >= start_date."
    },
    "page": {
      "type": "number",
      "description": "Page number"
    },
    "per_page": {
      "type": "number",
      "description": "Page size, 1-100 (default 50)"
    }
  },
  async run(input: any, ctx: any) {
    const res = await request(ctx.credential, "/schedules", {
      query: {
        start_date: str(input.start_date),
        end_date: str(input.end_date),
        page: num(input.page),
        per_page: num(input.per_page),
      },
    });
    return collection(res, "schedules");
  },
});
