---
summary: How an agent picks a concept, checks a relationship, and keeps a model in a scene.
---
# Using the language

ArchiMate is a vocabulary for describing an organisation at several heights at once: why it does things, who does them, which software does them, and what runs the software. This provider carries that vocabulary in a form the agent reads: the concept set, the relationship kinds, and the table that says which relationship may join which two concepts.

## Three habits

1. **Name the thing before you relate it.** `archimate_lookup` takes a rough phrase and returns the concept and its layer. A machine on a shop floor is Equipment, not Node. A person is a Business Actor; the responsibility they hold is a Business Role.
2. **Check before you assert.** `archimate_check` answers whether Serving from an Application Function to a Business Process is permitted, and lists what is permitted when it is not. The table has 3,844 rows; do not guess.
3. **Keep one current-state model per scene.** `archimate_derive` builds it from the scene's assets and the jobs that ran. Store the result in an `archimate/model` asset. Re-derive after the scene changes; the model is a regenerated view, not a hand-maintained document.

## Layers, in one line each

- **Strategy**: capabilities, resources, value streams, courses of action. What the organisation can do.
- **Motivation**: stakeholders, drivers, goals, requirements, constraints. Why.
- **Business**: actors, roles, processes, services, business objects. Who does what.
- **Application**: components, interfaces, functions, processes, services, data objects. Which software.
- **Technology**: nodes, devices, system software, networks, artifacts. What it runs on.
- **Physical**: equipment, facilities, distribution networks, material. The world outside the computer.
- **Implementation and Migration**: work packages, deliverables, plateaus, gaps. How the architecture changes.

## Aspects

Every concept in the core layers is active (does the work), behaviour (the work itself), or passive (what the work is done to). The relationship table follows from this: active elements are assigned to behaviour, behaviour accesses passive elements, services serve the layer above. When a relationship you want is not permitted, the aspect is usually the reason.

## What a model looks like

```json
{
  "name": "Depot maintenance (current state)",
  "elements": [
    { "id": "actor-technician", "type": "BusinessActor", "name": "Depot technician" },
    { "id": "proc-inspection", "type": "BusinessProcess", "name": "Inspect returned equipment" },
    { "id": "fn-create-order", "type": "ApplicationFunction", "name": "sap_create_service_order" },
    { "id": "comp-erp", "type": "ApplicationComponent", "name": "ERP" }
  ],
  "relationships": [
    { "id": "r1", "type": "Assignment", "source": "actor-technician", "target": "proc-inspection" },
    { "id": "r2", "type": "Serving", "source": "fn-create-order", "target": "proc-inspection" },
    { "id": "r3", "type": "Assignment", "source": "comp-erp", "target": "fn-create-order" }
  ]
}
```

The ArchiMate specification is a standard of The Open Group. The concept names here are the standard's; the meanings are written in our own words and are not the normative text.
