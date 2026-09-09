import { defineTool } from "@daslabhq/asset-provider";
import { isPermitted } from "../../../lib/model";

export default defineTool({
  name: "archimate_check",
  description: "Check whether a relationship between two concept types is permitted by the ArchiMate 3.2 relationship table before asserting it. Returns ok, the reason when not, and the full list of relationships that are permitted between the two types.",
  readOnly: true,
  input: {
    source: { type: "string", description: "Source concept, e.g. BusinessProcess" },
    relationship: { type: "string", description: "Composition, Aggregation, Assignment, Realization, Serving, Access, Influence, Association, Triggering, Flow, or Specialization" },
    target: { type: "string", description: "Target concept, e.g. BusinessService" },
  },
  required: ["source", "relationship", "target"],
  async run(input: { source: string; relationship: string; target: string }) {
    return isPermitted(input.source, input.relationship, input.target);
  },
});
