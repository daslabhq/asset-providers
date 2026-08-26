import { defineTool } from "@daslabhq/asset-provider";
import { read, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "List the sensored machines, lines and cells in this tenant. Each row carries `deviceid` (the id every per-device tool needs), `nickname` (the human name), `status`, alert `thresholds` and a utilisation `target`. There is no server-side filter or paging on this endpoint.",
  readOnly: true,
  async run(_input: unknown, ctx: { credential: GuidewheelCredential }) {
    return read(ctx.credential, "/devices");
  },
});
