import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap } from "../../../lib/client";

export default defineTool({
  description: "List the center(s) this API key is authorized for — typically one row. Returns the connection id, center id, address, and the center's IANA timezone. Call this first to confirm which studio the key reaches and which timezone the event times are in.",
  readOnly: true,
  async run(_input: any, ctx: any) {
    return unwrap(await request(ctx.credential, "/centers")).data;
  },
});
