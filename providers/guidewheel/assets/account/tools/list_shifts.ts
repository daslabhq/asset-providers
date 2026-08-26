import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List the tenant's shift definitions — name, start and end time, duration, whether the shift crosses midnight, and status. These are definitions, not occurrences, so this endpoint takes no time range; use the boundaries to scope uptime and production reads to a shift.",
  readOnly: true,
  input: {
    status: { type: "string", enum: ["A", "D"], description: "Filter by status: A active, D deleted/disabled." },
  },
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/shifts", { status: input.status });
  },
});
