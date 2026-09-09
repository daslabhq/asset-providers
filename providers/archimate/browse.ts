import { defineBrowse } from "@daslabhq/asset-provider";

/**
 * Models are made by tools, not fetched from an API, so the picker offers
 * starting points: an empty model to fill with archimate_derive or
 * archimate_import, and one worked example.
 */
export default defineBrowse(async ({ search }) => {
  const items = [
    { id: "empty", name: "New model", description: "An empty ArchiMate model. Fill it with archimate_derive or archimate_import.", metadata: { name: "New model", elements: 0, relationships: 0, source: "empty", model: JSON.stringify({ name: "New model", version: "3.2", elements: [], relationships: [] }) } },
    { id: "example-depot", name: "Example: depot maintenance", description: "A nine-element worked example across business, application, technology and physical layers.", metadata: EXAMPLE },
  ];
  const q = search.trim().toLowerCase();
  return { items: q ? items.filter((i) => (i.name + " " + i.description).toLowerCase().includes(q)) : items };
});

const EXAMPLE_MODEL = {
  name: "Depot maintenance (example)", version: "3.2", source: "example",
  elements: [
    { id: "cap", type: "Capability", name: "Field maintenance" },
    { id: "actor", type: "BusinessActor", name: "Depot technician" },
    { id: "proc", type: "BusinessProcess", name: "Inspect returned equipment" },
    { id: "fn1", type: "ApplicationFunction", name: "sap_create_service_order" },
    { id: "fn2", type: "ApplicationFunction", name: "gmail_send" },
    { id: "erp", type: "ApplicationComponent", name: "ERP" },
    { id: "pi", type: "Device", name: "Bench node" },
    { id: "arm", type: "Equipment", name: "Robot arm" },
    { id: "policy", type: "Constraint", name: "No send without approval" },
  ],
  relationships: [
    { id: "r1", type: "Assignment", source: "actor", target: "proc" },
    { id: "r2", type: "Serving", source: "fn1", target: "proc" },
    { id: "r3", type: "Serving", source: "fn2", target: "proc" },
    { id: "r4", type: "Assignment", source: "erp", target: "fn1" },
    { id: "r5", type: "Flow", source: "fn1", target: "fn2" },
    { id: "r6", type: "Realization", source: "proc", target: "cap" },
    { id: "r7", type: "Serving", source: "pi", target: "erp" },
    { id: "r8", type: "Serving", source: "arm", target: "pi" },
    { id: "r9", type: "Association", source: "policy", target: "fn2" },
  ],
};
const EXAMPLE = { name: EXAMPLE_MODEL.name, elements: EXAMPLE_MODEL.elements.length, relationships: EXAMPLE_MODEL.relationships.length, source: "example", model: JSON.stringify(EXAMPLE_MODEL) };
