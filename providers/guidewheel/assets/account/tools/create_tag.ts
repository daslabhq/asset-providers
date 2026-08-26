import { defineTool } from "@daslabhq/asset-provider";
import { write, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Create a tag — a downtime or scrap reason code — in Guidewheel.",
  requiresApproval: true,
  input: {
    fields: {
      type: "object",
      description:
        "The tag's fields, sent verbatim as the JSON request body. Field names are tenant-specific — list existing records first to see the shape your tenant uses.",
    },
  },
  required: ["fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return { created: true, tag: await write(ctx.credential, "POST", "/tags", requiredFields(input.fields)) };
  },
});
