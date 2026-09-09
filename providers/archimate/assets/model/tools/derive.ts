import { defineTool } from "@daslabhq/asset-provider";
import { deriveModel, type SceneSnapshot } from "../../../lib/derive";
import { summarize, validateModel } from "../../../lib/model";

export default defineTool({
  name: "archimate_derive",
  description: "Build the current-state architecture model of a scene from a snapshot of what it holds and what ran: assets (from daslab_get_scene_assets), jobs with the tools they called (from daslab_list_jobs and job summaries), members, and policies. Providers become application components, accounts become interfaces, tools become functions, jobs become business processes served by those functions, tool order becomes flow. Returns the model, its summary, and its validation. Store the model in an archimate/model asset's model field, or pass it to archimate_export.",
  readOnly: true,
  input: {
    scene: { type: "object", description: "{ id, name, description? }" },
    assets: { type: "array", description: "[{ id?, name, type: 'provider/type', status?, description? }]", items: { type: "object" } },
    jobs: { type: "array", description: "[{ id?, title, status?, tools?: [tool names in call order], created_at? }]", items: { type: "object" } },
    members: { type: "array", description: "[{ name, role?, kind?: 'human' | 'agent' }]", items: { type: "object" } },
    policies: { type: "array", description: "[{ name, tool?, description? }] approval rules or scene policies", items: { type: "object" } },
    children: { type: "array", description: "[{ id?, name }] child scenes", items: { type: "object" } },
    options: { type: "object", description: "{ maxJobs?: number } default 40" },
  },
  required: ["scene"],
  async run(input: SceneSnapshot) {
    const model = deriveModel(input);
    return { model, summary: summarize(model), validation: validateModel(model) };
  },
});
