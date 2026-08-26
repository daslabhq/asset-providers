import { defineTool } from "@daslabhq/asset-provider";
import { read, isoTime, type GuidewheelCredential } from "../../../lib/client";

const ONE_DAY = 24 * 60 * 60 * 1000;

export default defineTool({
  description:
    "List scrap events in a time range. Note this endpoint requires ISO 8601 `from`/`to`, not the unix-ms from_ts/to_ts used elsewhere; both are required by the API, so a default 24-hour window is applied when omitted.",
  readOnly: true,
  input: {
    from: { type: "string", description: "Range start as an ISO 8601 string. Defaults to 24 hours ago." },
    to: { type: "string", description: "Range end as an ISO 8601 string. Defaults to now." },
    device_id: { type: "string", description: "Only scrap for this device." },
    ids: { type: "string", description: "Specific scrap ids." },
  },
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/scraps", {
      from: isoTime(input.from, ONE_DAY),
      to: isoTime(input.to, 0),
      device_id: input.device_id,
      ids: input.ids,
    });
  },
});
