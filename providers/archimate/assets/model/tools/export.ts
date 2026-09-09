import { defineTool } from "@daslabhq/asset-provider";
import { parseModel, toExchangeXml, validateModel } from "../../../lib/model";

export default defineTool({
  name: "archimate_export",
  description: "Write a model as an ArchiMate Model Exchange File Format XML document, the interchange file that Archi, LeanIX, Ardoq, BiZZdesign and Sparx import. Validates first and refuses a model with findings unless force is true. Returns the XML as text.",
  readOnly: true,
  input: {
    model: { type: "object", description: "A model object or JSON string" },
    force: { type: "boolean", description: "Export even when validation has findings" },
  },
  required: ["model"],
  async run(input: { model: unknown; force?: boolean }) {
    const model = parseModel(input.model);
    const v = validateModel(model);
    if (!v.ok && !input.force) throw new Error(`Model has ${v.findings.length} finding(s); fix them or pass force: true. First: ${v.findings[0].problem}`);
    return { xml: toExchangeXml(model), elements: model.elements.length, relationships: model.relationships.length, findings: v.findings.length };
  },
});
