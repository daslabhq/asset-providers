import { defineTool } from "@daslabhq/asset-provider";
import { write, required, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Append a comment to a downtime issue. This is the only free-text write onto an issue — guidewheel_update_issue carries status and times only — so it is where a reference from another system belongs: the work-order or maintenance-notification number a CMMS or ERP created for this downtime, so the floor sees it on the issue they already look at.",
  requiresApproval: true,
  input: {
    issue_id: { type: "string", description: "Id of the issue to comment on, from guidewheel_list_issues." },
    comment: { type: "string", description: "The comment text." },
  },
  required: ["issue_id", "comment"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.issue_id, "issue_id");
    const comment = required(input.comment, "comment");
    const path = `/issues/${encodeURIComponent(id)}/comments`;
    return { commented: true, result: await write(ctx.credential, "POST", path, { comment }) };
  },
});
