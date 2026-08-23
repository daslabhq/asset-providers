import { defineTool } from "@daslabhq/asset-provider";
import { request, collection, num } from "../../../lib/client";

export default defineTool({
  name: "kenko_list_appointments",
  description: "List active public appointment products (1:1 or small-group services) that partners can book against. Returns duration, the slot grid increment, and how many concurrent bookings each slot allows. These are service types, not scheduled sessions — use kenko_list_appointment_slots for actual times.",
  readOnly: true,
  input: {
    "per_page": {
      "type": "number",
      "description": "Page size, 1-100 (default 50)"
    }
  },
  async run(input: any, ctx: any) {
    const res = await request(ctx.credential, "/appointments", { query: { per_page: num(input.per_page) } });
    return collection(res, "appointments");
  },
});
