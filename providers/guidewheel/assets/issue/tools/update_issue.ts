import { defineTool } from "@daslabhq/asset-provider";
import { write, required, requiredFields, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Update a downtime issue — the CMMS/ERP write-back hook. Attach a work-order number or sync its status so the floor view and the maintenance system stay aligned. Issues are the only fully read-write entity in Guidewheel, precisely for this.",
  requiresApproval: true,
  input: {
    issue_id: { type: "string", description: "Id of the issue to update, from guidewheel_list_issues." },
    fields: {
      type: "object",
      description: "The fields to set, sent verbatim as the JSON request body. Field names are tenant-specific.",
    },
  },
  required: ["issue_id", "fields"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.issue_id, "issue_id");
    const path = `/issues/${encodeURIComponent(id)}`;
    return { updated: true, issue: await write(ctx.credential, "PATCH", path, requiredFields(input.fields)) };
  },
});
