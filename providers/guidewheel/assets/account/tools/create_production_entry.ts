import { defineTool } from "@daslabhq/asset-provider";
import { write, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Record a production entry — a run with produced quantities — in Guidewheel, for example to push an ERP's planned-order actuals onto the floor.",
  requiresApproval: true,
  input: {
    fields: {
      type: "object",
      description:
        "The production entry's fields, sent verbatim as the JSON request body. Field names are tenant-specific — list existing records first to see the shape your tenant uses.",
    },
  },
  required: ["fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return { created: true, entry: await write(ctx.credential, "POST", "/production-entries", requiredFields(input.fields)) };
  },
});
