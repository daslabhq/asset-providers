import { defineTool } from "@daslabhq/asset-provider";
import { write, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Create a SKU in Guidewheel, for example to sync a product in from an ERP.",
  requiresApproval: true,
  input: {
    fields: {
      type: "object",
      description:
        "The SKU's fields, sent verbatim as the JSON request body. Field names are tenant-specific — list existing records first to see the shape your tenant uses.",
    },
  },
  required: ["fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return { created: true, sku: await write(ctx.credential, "POST", "/skus", requiredFields(input.fields)) };
  },
});
