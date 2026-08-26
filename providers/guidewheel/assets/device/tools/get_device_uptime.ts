import { defineTool } from "@daslabhq/asset-provider";
import { read, required, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Uptime summary for one machine over a range — running, idle and down durations. Supports group_by=day. Combine with production entries and scrap to compute OEE; Guidewheel has no computed-OEE endpoint.",
  readOnly: true,
  input: {
    device_id: { type: "string", description: "Device id from guidewheel_list_devices." },
    from_ts: { type: "number", description: "Range start, unix epoch milliseconds." },
    to_ts: { type: "number", description: "Range end, unix epoch milliseconds." },
    group_by: { type: "string", enum: ["day"], description: "Only \"day\" is supported." },
  },
  required: ["device_id"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.device_id, "device_id");
    return read(ctx.credential, `/devices/${encodeURIComponent(id)}/uptime`, {
      from_ts: input.from_ts,
      to_ts: input.to_ts,
      group_by: input.group_by,
    });
  },
});
