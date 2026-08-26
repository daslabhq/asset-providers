import { defineTool } from "@daslabhq/asset-provider";
import { rawGet, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Raw GET against any path under /api/v1 — the schema-discovery escape hatch. Guidewheel distributes the field-level API guide on request, so when a documented parameter is rejected or a response field is missing, probe the live surface here and adapt. Mind the tenant rate limit: 1000 calls/day, 50/min.",
  readOnly: true,
  input: {
    path: { type: "string", description: "Path under /api/v1, e.g. \"/devices\" or \"/issues/123\"." },
    query: { type: "object", description: "Query params, passed through verbatim." },
  },
  required: ["path"],
  async run(
    input: { path: string; query?: Record<string, unknown> },
    ctx: { credential: GuidewheelCredential },
  ) {
    const path = String(input.path ?? "").trim();
    if (!path) throw new Error("path is required");
    return rawGet(ctx.credential, path, input.query);
  },
});
