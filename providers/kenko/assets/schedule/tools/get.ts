import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap, str } from "../../../lib/client";

export default defineTool({
  name: "kenko_get_schedule",
  description: "Get one public class session by its UUID. Same shape as an entry from kenko_list_schedules. Answers 'Schedule not found.' if the id is unknown, not a public class, or belongs to another center.",
  readOnly: true,
  input: {
    "schedule_id": {
      "type": "string",
      "description": "Event UUID from kenko_list_schedules"
    }
  },
  required: ["schedule_id"],
  async run(input: any, ctx: any) {
    const id = str(input.schedule_id);
    if (!id) throw new Error("schedule_id is required.");
    return unwrap(await request(ctx.credential, `/schedules/${encodeURIComponent(id)}`)).data;
  },
});
