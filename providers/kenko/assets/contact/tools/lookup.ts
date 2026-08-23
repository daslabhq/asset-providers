import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, str, num } from "../../../lib/client";

export default defineTool({
  name: "kenko_lookup_contacts",
  description: "Search existing customers at the connected center by name, email, or phone. Searches all non-archived contacts, not just partner-created ones. Returns up to 50 matches.",
  readOnly: true,
  input: {
    "query": {
      "type": "string",
      "description": "Search term matched against name, email, or phone"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results, 1-50 (default 50)"
    }
  },
  required: ["query"],
  async run(input: any, ctx: any) {
    const query = str(input.query);
    if (!query) throw new Error("query is required.");
    const res = await request(ctx.credential, "/contacts", { query: { query, limit: num(input.limit) } });
    return unwrap(res).data;
  },
});
