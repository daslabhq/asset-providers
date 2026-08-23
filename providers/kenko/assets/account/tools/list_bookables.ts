import { defineTool } from "@daslabhq/asset-provider";
import { request, unwrap } from "../../../lib/client";

export default defineTool({
  name: "kenko_list_bookables",
  description: "List the Instructors and Facilities linked to public appointments, each with the appointment ids it can serve. You need a bookable id from here both to scope a slot search and to create an appointment booking.",
  readOnly: true,
  async run(_input: any, ctx: any) {
    return unwrap(await request(ctx.credential, "/bookables")).data;
  },
});
