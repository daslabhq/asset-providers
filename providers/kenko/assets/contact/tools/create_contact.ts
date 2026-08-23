import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, toCustomer } from "../../../lib/client";

// Find-or-create by email: an existing contact is returned, never duplicated.
export default defineTool({
  description: "Find-or-create a customer by email. If a contact with that email already exists at the center the existing record is returned and nothing is created. New contacts are attributed to this partner as their lead source. Booking tools do this for you — call this directly only to register someone ahead of a booking.",
  requiresApproval: true,
  input: {
    "email": {
      "type": "string",
      "description": "Lookup key"
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
  required: ["email"],
  async run(input: any, ctx: any) {
    const customer = toCustomer(input);
    if (!customer.email) throw new Error("email is required.");
    return unwrap(await request(ctx.credential, "/contacts", { method: "POST", body: customer })).data;
  },
});
