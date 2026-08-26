import { defineTool } from "@daslabhq/asset-provider";
import { read, required, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Load-state time series for one machine — the run/idle/down signal derived from its current draw. Returns contiguous spans of state (online, idle, offline, planned downtime, nodata) with start/end in unix ms, keyed by device id. This and guidewheel_list_issues are the two endpoints Guidewheel recommends for machine state and downtime reasons.",
  readOnly: true,
  input: {
    device_id: {
      type: "string",
      description: "Device id from guidewheel_list_devices (the `deviceid` field, e.g. \"acme_press4_prs4\").",
    },
    from_ts: { type: "number", description: "Range start, unix epoch milliseconds." },
    to_ts: { type: "number", description: "Range end, unix epoch milliseconds." },
  },
  required: ["device_id"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.device_id, "device_id");
    return read(ctx.credential, `/devices/${encodeURIComponent(id)}/loadStates`, {
      from_ts: input.from_ts,
      to_ts: input.to_ts,
    });
  },
});
