import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List production entries — runs with start/end, produced quantities, waste and a computed OEE block. This is the \"actuals out\" half of an ERP integration. Keep the window narrow: this endpoint has no paging and slows sharply as the range widens (roughly 2s for a shift, 11s for three days), and a seven-day range has been observed to fail server-side with a bodyless 500. Read shift by shift or day by day rather than asking for a week at once.",
  readOnly: true,
  input: {
    from_ts: { type: "number", description: "Range start, unix epoch milliseconds." },
    to_ts: { type: "number", description: "Range end, unix epoch milliseconds." },
    sku: { type: "string", description: "Only entries for this SKU." },
    device_id: { type: "string", description: "Only entries for this device." },
  },
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/production-entries", {
      from_ts: input.from_ts,
      to_ts: input.to_ts,
      sku: input.sku,
      device_id: input.device_id,
    });
  },
});
