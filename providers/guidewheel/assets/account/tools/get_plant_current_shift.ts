import { defineTool } from "@daslabhq/asset-provider";
import { read, required, type GuidewheelCredential } from "../../../lib/client";

export default defineTool({
  description:
    "Which shift a given plant is currently on, with the shift's start and end. Guidewheel has no endpoint that lists plants: plant ids are the ids of the site-level entries returned by guidewheel_list_device_lists (a list named like \"1 - Metals Plant\" doubles as a plant). The id must be a positive integer.",
  readOnly: true,
  input: {
    plant_id: {
      type: "number",
      description: "Plant id — the id of a site-level list from guidewheel_list_device_lists.",
    },
  },
  required: ["plant_id"],
  async run(input: any, ctx: { credential: GuidewheelCredential }) {
    const id = required(input.plant_id, "plant_id");
    return read(ctx.credential, `/plants/${encodeURIComponent(id)}/current-shift`);
  },
});
