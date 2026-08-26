import { defineTool } from "@daslabhq/asset-provider";
import { write, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Create a downtime issue in Guidewheel — for example to mirror an event raised in another system onto the factory floor view.",
  requiresApproval: true,
  input: {
    fields: {
      type: "object",
      description:
        "The issue's fields, sent verbatim as the JSON request body. Field names are tenant-specific — list existing records first to see the shape your tenant uses.",
    },
  },
  required: ["fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return { created: true, issue: await write(ctx.credential, "POST", "/issues", requiredFields(input.fields)) };
  },
});
