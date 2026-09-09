import { defineTool } from "@daslabhq/asset-provider";
import { CONCEPT_BY_NAME } from "../../../lib/concepts";
import { fromExchangeXml, summarize, validateModel } from "../../../lib/model";

export default defineTool({
  name: "archimate_import",
  description: "Read an ArchiMate Model Exchange File Format XML document into a model. Views and folders are ignored; elements, relationships, documentation and properties are kept. Returns the model, its summary, validation, and the Constraints and Requirements found, which are candidates for scene policies.",
  readOnly: true,
  input: {
    xml: { type: "string", description: "The exchange file contents" },
  },
  required: ["xml"],
  async run(input: { xml: string }) {
    const model = fromExchangeXml(String(input.xml ?? ""));
    if (!model.elements.length) throw new Error("No ArchiMate elements found. Is this an exchange-format file (root <model xmlns=\"http://www.opengroup.org/xsd/archimate/3.0/\">)?");
    const motivation = model.elements.filter((e) => ["Constraint", "Requirement", "Principle"].includes(e.type)).map((e) => ({ id: e.id, type: e.type, name: e.name, documentation: e.documentation }));
    return { model, summary: summarize(model), validation: validateModel(model), policyCandidates: motivation, layers: Array.from(new Set(model.elements.map((e) => CONCEPT_BY_NAME[e.type].layer))) };
  },
});
