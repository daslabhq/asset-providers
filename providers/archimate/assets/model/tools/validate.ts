import { defineTool } from "@daslabhq/asset-provider";
import { parseModel, validateModel } from "../../../lib/model";

export default defineTool({
  name: "archimate_validate",
  description: "Validate a whole model: every element has a known concept type, every relationship joins two elements that exist and is permitted between their types. Returns findings with the offending element or relationship id.",
  readOnly: true,
  input: {
    model: { type: "object", description: "A model object { name, elements: [{id,type,name}], relationships: [{id,type,source,target}] }, or the same as a JSON string" },
  },
  required: ["model"],
  async run(input: { model: unknown }) {
    return validateModel(parseModel(input.model));
  },
});
