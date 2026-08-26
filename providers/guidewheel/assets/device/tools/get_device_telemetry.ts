import { defineTool } from "@daslabhq/asset-provider";
import { read, required, isoTime, type GuidewheelCredential } from "../../../lib/client";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export default defineTool({
  description:
    "Per-minute telemetry for one machine, or per-second for active power. Returns { metric, name, unit, granularity, points[{from,avg,min,max}] }. Note this endpoint takes ISO 8601 `from`/`to`, not the unix-ms from_ts/to_ts the state and uptime endpoints use.",
  readOnly: true,
  input: {
    device_id: { type: "string", description: "Device id from guidewheel_list_devices." },
    metric: {
      type: "string",
      description: "Metric code to return, e.g. \"Psum\" (Active Power, kW). Metric codes are tenant-specific.",
    },
    granularity: { type: "string", enum: ["minute", "second"], description: "\"second\" is only available for active power." },
    from: { type: "string", description: "Range start as an ISO 8601 string, e.g. 2026-06-01T00:00:00.000Z. Defaults to 6 hours ago." },
    to: { type: "string", description: "Range end as an ISO 8601 string. Defaults to now." },
  },
  required: ["device_id", "metric"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.device_id, "device_id");
    return read(ctx.credential, `/devices/${encodeURIComponent(id)}/telemetry`, {
      metric: required(input.metric, "metric"),
      granularity: input.granularity || "minute",
      from: isoTime(input.from, SIX_HOURS),
      to: isoTime(input.to, 0),
    });
  },
});
