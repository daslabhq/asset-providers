import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, decodeBooking, str } from "../../../lib/client";

// Accepts the Kenko numeric booking id or the external_reference_id you booked with.
export default defineTool({
  description: "Cancel a booking made by this partner, addressed by either the Kenko numeric booking id or your own external reference id. Only this partner's bookings at the connected studio can be cancelled. Cancelling an already-cancelled booking succeeds quietly. Afterwards the external reference id is free to reuse on a new booking.",
  requiresApproval: true,
  input: {
    "booking_id": {
      "type": "string",
      "description": "Kenko numeric booking id, or the external_reference_id you booked with"
    }
  },
  required: ["booking_id"],
  async run(input: any, ctx: any) {
    const id = str(input.booking_id);
    if (!id) throw new Error("booking_id is required.");
    return decodeBooking(unwrap(await request(ctx.credential, `/bookings/${encodeURIComponent(id)}`, { method: "DELETE" })).data);
  },
});
