import { defineTool } from "@daslabhq/asset-provider";
import { read, required, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Read one downtime issue by id, including its tags, comments and changelog. Use it to confirm a write landed — after commenting a work-order number onto an issue, for instance — rather than re-listing a whole time range.",
  readOnly: true,
  input: {
    issue_id: { type: "string", description: "Id of the issue, from guidewheel_list_issues." },
  },
  required: ["issue_id"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.issue_id, "issue_id");
    return read(ctx.credential, `/issues/${encodeURIComponent(id)}`);
  },
});
