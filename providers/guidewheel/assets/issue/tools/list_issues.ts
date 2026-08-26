import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List downtime issues — the events Guidewheel's alerting raises when a machine goes down — with their tags and comments. Each carries `deviceid`, `status`, `startedAt` (unix ms as a string), an `issuetype`, a `tags` array whose `tagname` is the operator-selected downtime reason, and a `changelog`. With guidewheel_get_load_states this is the pair Guidewheel recommends for state and downtime reasoning.",
  readOnly: true,
  input: {
    from_ts: { type: "number", description: "Range start, unix epoch milliseconds." },
    to_ts: { type: "number", description: "Range end, unix epoch milliseconds." },
    updated: { type: "string", description: "Filter on the updated timestamp instead of the start time." },
    comments: { type: "string", description: "Include issue comments in the response." },
  },
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/issues", {
      from_ts: input.from_ts,
      to_ts: input.to_ts,
      updated: input.updated,
      comments: input.comments,
    });
  },
});
