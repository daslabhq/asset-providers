import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List tags — the standardized downtime and scrap reason codes operators pick from. Each carries tagname, tagcolor, tagtype and an optional planned-duration target.",
  readOnly: true,
  async run(_input: unknown, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/tags");
  },
});
