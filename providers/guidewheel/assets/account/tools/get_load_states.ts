import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Load states for EVERY machine in the tenant over a range, in one call — returns an object keyed by device id, each holding contiguous spans of state (online, idle, offline, planned downtime, nodata) with start/end in unix ms. Prefer this over calling guidewheel_get_device_state per machine: it is one request against the 1000/day budget instead of dozens.",
  readOnly: true,
  input: {
    from_ts: { type: "number", description: "Range start, unix epoch milliseconds." },
    to_ts: { type: "number", description: "Range end, unix epoch milliseconds." },
  },
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/devices/loadStates", { from_ts: input.from_ts, to_ts: input.to_ts });
  },
});
