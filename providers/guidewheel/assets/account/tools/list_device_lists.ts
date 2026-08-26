import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List device lists — curated machine groups used for role-based visibility, such as all machines at one site. Each carries a name and the device ids it contains, which is the closest thing Guidewheel exposes to a plant roster.",
  readOnly: true,
  async run(_input: unknown, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/device-lists");
  },
});
