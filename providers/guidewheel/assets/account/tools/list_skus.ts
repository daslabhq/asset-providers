import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List SKUs — the products defined in Guidewheel, typically synced in from an ERP which stays the source of truth. Returns a bare array (not wrapped in a data envelope) with skucode and status.",
  readOnly: true,
  async run(_input: unknown, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/skus");
  },
});
