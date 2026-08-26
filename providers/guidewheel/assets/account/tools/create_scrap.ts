import { defineTool } from "@daslabhq/asset-provider";
import { write, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Record a scrap event in Guidewheel.",
  requiresApproval: true,
  input: {
    fields: {
      type: "object",
      description:
        "The scrap event's fields, sent verbatim as the JSON request body. Field names are tenant-specific — list existing records first to see the shape your tenant uses.",
    },
  },
  required: ["fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return { created: true, scrap: await write(ctx.credential, "POST", "/scraps", requiredFields(input.fields)) };
  },
});
