/**
 * The ArchiMate 3.2 concept set, written in our own words.
 *
 * Each concept carries the layer it belongs to, its aspect (what kind of
 * thing it is), and a one-line meaning an agent can act on. The names are
 * the standard's names; the meanings are ours. The normative text is
 * copyright The Open Group and is not reproduced here.
 */

export type Layer =
  | "strategy"
  | "business"
  | "application"
  | "technology"
  | "physical"
  | "motivation"
  | "implementation"
  | "composite";

export type Aspect =
  | "active"      // who or what does the work: actors, roles, components, nodes
  | "behavior"    // what gets done: processes, functions, events, services
  | "passive"     // what the work is done to: objects, data, artifacts, material
  | "motivation"  // why: stakeholders, goals, requirements, constraints
  | "composite";  // groupings and junctions with no aspect of their own

export interface Concept {
  name: string;
  layer: Layer;
  aspect: Aspect;
  meaning: string;
}

export const CONCEPTS: Concept[] = [
  // Strategy
  { name: "Resource", layer: "strategy", aspect: "passive", meaning: "Something the organisation owns or controls and can draw on: people, money, machines, know-how." },
  { name: "Capability", layer: "strategy", aspect: "behavior", meaning: "An ability the organisation has, named without saying how it is done. 'Field maintenance', not 'the maintenance process'." },
  { name: "ValueStream", layer: "strategy", aspect: "behavior", meaning: "The end-to-end sequence of stages that produces a result a stakeholder values." },
  { name: "CourseOfAction", layer: "strategy", aspect: "behavior", meaning: "A chosen plan or strategy: what the organisation has decided to do with its capabilities and resources." },

  // Business
  { name: "BusinessActor", layer: "business", aspect: "active", meaning: "A person, team, or organisation that does business work. A customer, a clerk, a supplier, a department." },
  { name: "BusinessRole", layer: "business", aspect: "active", meaning: "A responsibility an actor takes on. 'Approver' is a role; the person holding it is an actor." },
  { name: "BusinessCollaboration", layer: "business", aspect: "active", meaning: "Two or more roles working together on something neither does alone." },
  { name: "BusinessInterface", layer: "business", aspect: "active", meaning: "The point where a business service is reached: a counter, a phone line, an account manager." },
  { name: "BusinessProcess", layer: "business", aspect: "behavior", meaning: "A sequence of business steps that turns inputs into an outcome. Has an order." },
  { name: "BusinessFunction", layer: "business", aspect: "behavior", meaning: "Business work grouped by skill or resource rather than by sequence. 'Procurement' as a thing the organisation does." },
  { name: "BusinessInteraction", layer: "business", aspect: "behavior", meaning: "Business behaviour that only happens when two or more roles act together." },
  { name: "BusinessEvent", layer: "business", aspect: "behavior", meaning: "Something that happens and changes the state of business: an order arrives, a deadline passes." },
  { name: "BusinessService", layer: "business", aspect: "behavior", meaning: "Business behaviour offered to the outside, described by what it delivers rather than how." },
  { name: "BusinessObject", layer: "business", aspect: "passive", meaning: "A concept the business works with, independent of how it is stored: an order, an invoice, a claim." },
  { name: "Contract", layer: "business", aspect: "passive", meaning: "A business object that records an agreement between parties." },
  { name: "Representation", layer: "business", aspect: "passive", meaning: "A perceivable form of a business object: the printed invoice, the PDF, the screen." },
  { name: "Product", layer: "business", aspect: "composite", meaning: "A bundle of services and a contract offered to customers as one thing." },

  // Application
  { name: "ApplicationComponent", layer: "application", aspect: "active", meaning: "A deployable, self-contained piece of software with its own behaviour. An ERP module, a service, an app." },
  { name: "ApplicationCollaboration", layer: "application", aspect: "active", meaning: "Two or more application components that work together to do something." },
  { name: "ApplicationInterface", layer: "application", aspect: "active", meaning: "Where an application's services are reached: an API, a screen, a queue endpoint." },
  { name: "ApplicationFunction", layer: "application", aspect: "behavior", meaning: "Automated behaviour grouped by what it does, performed by a component." },
  { name: "ApplicationInteraction", layer: "application", aspect: "behavior", meaning: "Application behaviour that only happens across a collaboration of components." },
  { name: "ApplicationProcess", layer: "application", aspect: "behavior", meaning: "Automated behaviour with an order of steps, performed by a component." },
  { name: "ApplicationEvent", layer: "application", aspect: "behavior", meaning: "Something that happens inside or to an application and triggers behaviour: a message, a timer, a failure." },
  { name: "ApplicationService", layer: "application", aspect: "behavior", meaning: "Automated behaviour offered to users or other applications, described by what it does." },
  { name: "DataObject", layer: "application", aspect: "passive", meaning: "Data as an application sees it: a record, a table, a message payload." },

  // Technology
  { name: "Node", layer: "technology", aspect: "active", meaning: "A computing resource that hosts and runs things: a server, a VM, a container host, a cloud service." },
  { name: "Device", layer: "technology", aspect: "active", meaning: "A physical computing machine: a phone, a laptop, a Raspberry Pi, a PLC." },
  { name: "SystemSoftware", layer: "technology", aspect: "active", meaning: "Software that provides an environment for other software: an operating system, a database engine, a runtime." },
  { name: "TechnologyCollaboration", layer: "technology", aspect: "active", meaning: "Two or more nodes working together." },
  { name: "TechnologyInterface", layer: "technology", aspect: "active", meaning: "Where a node's services are reached: a port, a socket, a mount." },
  { name: "Path", layer: "technology", aspect: "active", meaning: "A link between nodes over which data or material moves." },
  { name: "CommunicationNetwork", layer: "technology", aspect: "active", meaning: "A set of nodes and links that carry communication: a LAN, a mesh, the internet." },
  { name: "TechnologyFunction", layer: "technology", aspect: "behavior", meaning: "Behaviour a node performs, grouped by what it does." },
  { name: "TechnologyProcess", layer: "technology", aspect: "behavior", meaning: "Behaviour a node performs in an ordered sequence of steps." },
  { name: "TechnologyInteraction", layer: "technology", aspect: "behavior", meaning: "Behaviour that only happens across a collaboration of nodes." },
  { name: "TechnologyEvent", layer: "technology", aspect: "behavior", meaning: "Something that happens to infrastructure: a heartbeat, a reboot, a signal." },
  { name: "TechnologyService", layer: "technology", aspect: "behavior", meaning: "Infrastructure behaviour offered to applications or other nodes: storage, messaging, compute." },
  { name: "Artifact", layer: "technology", aspect: "passive", meaning: "A piece of data used or produced by infrastructure: a file, a binary, a database, a container image." },

  // Physical
  { name: "Equipment", layer: "physical", aspect: "active", meaning: "A machine or tool that does physical work: a robot arm, a lathe, a test bench." },
  { name: "Facility", layer: "physical", aspect: "active", meaning: "A place built for physical work: a plant, a depot, a lab, a warehouse." },
  { name: "DistributionNetwork", layer: "physical", aspect: "active", meaning: "The physical links that move material or energy between facilities: roads, pipes, conveyors." },
  { name: "Material", layer: "physical", aspect: "passive", meaning: "Tangible matter that physical work uses or produces: parts, raw stock, finished goods." },

  // Motivation
  { name: "Stakeholder", layer: "motivation", aspect: "motivation", meaning: "Someone with an interest in the outcome: a customer, a regulator, an owner, a team." },
  { name: "Driver", layer: "motivation", aspect: "motivation", meaning: "A condition that pushes the organisation to act: cost pressure, a new regulation, a competitor." },
  { name: "Assessment", layer: "motivation", aspect: "motivation", meaning: "A judgement about a driver: 'our lead time is twice the industry's'." },
  { name: "Goal", layer: "motivation", aspect: "motivation", meaning: "A high-level intended state: 'cut lead time in half'." },
  { name: "Outcome", layer: "motivation", aspect: "motivation", meaning: "A measurable result that shows a goal was reached." },
  { name: "Principle", layer: "motivation", aspect: "motivation", meaning: "A general rule the organisation chooses to follow: 'buy before build'." },
  { name: "Requirement", layer: "motivation", aspect: "motivation", meaning: "Something a system must do or have to realise a goal." },
  { name: "Constraint", layer: "motivation", aspect: "motivation", meaning: "A limit on how a goal may be reached: a budget, a law, a policy. In Daslab, the source of a scene policy." },
  { name: "Meaning", layer: "motivation", aspect: "motivation", meaning: "What something signifies to a stakeholder, in their context." },
  { name: "Value", layer: "motivation", aspect: "motivation", meaning: "The worth of something to a stakeholder." },

  // Implementation and migration
  { name: "WorkPackage", layer: "implementation", aspect: "behavior", meaning: "A bounded piece of change work with a start and an end: a project, a sprint, a rollout." },
  { name: "Deliverable", layer: "implementation", aspect: "passive", meaning: "A concrete result a work package produces." },
  { name: "ImplementationEvent", layer: "implementation", aspect: "behavior", meaning: "A moment in change work: a go-live, a milestone, a cutover." },
  { name: "Plateau", layer: "implementation", aspect: "composite", meaning: "A stable state of the architecture at a point in time: as-is, a transition, to-be." },
  { name: "Gap", layer: "implementation", aspect: "composite", meaning: "The difference between two plateaus." },

  // Composite
  { name: "Location", layer: "composite", aspect: "composite", meaning: "A place where things are: a site, a city, a room." },
  { name: "Grouping", layer: "composite", aspect: "composite", meaning: "A set of concepts collected for a reason: a domain, a bounded context, a team's estate." },
  { name: "Junction", layer: "composite", aspect: "composite", meaning: "A connector that joins several relationships of the same kind: an AND or OR split or merge." },
];

export const RELATIONSHIPS: Record<string, { key: string; kind: "structural" | "dependency" | "dynamic" | "other"; meaning: string }> = {
  Composition:    { key: "c", kind: "structural", meaning: "Source is made of target; the part cannot exist outside the whole." },
  Aggregation:    { key: "g", kind: "structural", meaning: "Source groups target; the part can exist on its own." },
  Assignment:     { key: "i", kind: "structural", meaning: "Source is responsible for, or performs, target. An actor to a role, a component to a function." },
  Realization:    { key: "r", kind: "structural", meaning: "Source makes target real. A process realises a service; a component realises a requirement." },
  Serving:        { key: "v", kind: "dependency", meaning: "Source provides its functionality to target." },
  Access:         { key: "a", kind: "dependency", meaning: "Source behaviour reads or writes the passive target." },
  Influence:      { key: "n", kind: "dependency", meaning: "Source affects target, positively or negatively, without a hard dependency." },
  Association:    { key: "o", kind: "dependency", meaning: "Some relationship not covered by the others. Always permitted." },
  Triggering:     { key: "t", kind: "dynamic", meaning: "Source starts target; a temporal or causal order." },
  Flow:           { key: "f", kind: "dynamic", meaning: "Something moves from source to target: information, material, money." },
  Specialization: { key: "s", kind: "other", meaning: "Source is a kind of target." },
};

export const LAYERS: Record<Layer, { label: string; color: string; order: number }> = {
  strategy:       { label: "Strategy",                     color: "F5DEAA", order: 0 },
  motivation:     { label: "Motivation",                   color: "CCCCFF", order: 1 },
  business:       { label: "Business",                     color: "FFFFB5", order: 2 },
  application:    { label: "Application",                  color: "B5FFFF", order: 3 },
  technology:     { label: "Technology",                   color: "C9E7B7", order: 4 },
  physical:       { label: "Physical",                     color: "C9E7B7", order: 5 },
  implementation: { label: "Implementation and Migration", color: "FFE0E0", order: 6 },
  composite:      { label: "Composite",                    color: "EEEEEE", order: 7 },
};

export const CONCEPT_BY_NAME: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.name, c]));

/** Resolve a loosely written concept name ("business actor", "app component", "node") to the standard name. */
export function resolveConcept(name: string): Concept | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  let n = norm(name);
  if (!/^(application|technology|business)/.test(n)) {
    n = n.replace(/^app(?=[a-z])/, "application").replace(/^tech(?=[a-z])/, "technology").replace(/^biz(?=[a-z])/, "business");
  }
  return CONCEPTS.find((c) => norm(c.name) === n);
}
