/**
 * @daslabhq/asset-provider — the authoring SDK.
 *
 * A tool module does `import { defineTool } from "@daslabhq/asset-provider"`.
 * The helpers are tags: they return the object they were given, marked with a
 * kind, so the Daslab loader can extract metadata at import and the runtime
 * can find `run`. Inside Daslab the same specifier resolves to this source
 * without node_modules; in a repo checkout, `bun install` links this package.
 */
export interface ToolContext<C = Record<string, string>> {
  input: Record<string, unknown>;
  credential: C;
  fetch: typeof fetch;
}
export interface ToolInputProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: unknown;
  properties?: unknown;
  required?: string[];
}
export interface ToolMeta {
  /** Defaults to {provider}_{file}_{asset} from the path; set it to pin the agent's contract. */
  name?: string;
  description: string;
  /** Shorthand for inputSchema.properties. */
  input?: Record<string, ToolInputProperty>;
  inputSchema?: Record<string, unknown>;
  required?: string[];
  readOnly?: boolean;
  requiresApproval?: boolean;
  costPerCall?: number;
}
export interface ToolDefinition<I = any, C = Record<string, string>> extends ToolMeta {
  run(input: I, ctx: ToolContext<C>): Promise<unknown> | unknown;
}
export interface BrowseItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}
export interface BrowseResult {
  items: BrowseItem[];
  error?: string;
}
export interface BrowseArgs {
  type: string;
  search: string;
  accountId: string;
  parentId: string;
}

/** A tool: metadata + handler in one object. The loader extracts the metadata at import. */
export function defineTool<I = any, C = Record<string, string>>(def: ToolDefinition<I, C>) {
  return Object.assign(def, { __daslab: "tool" as const });
}

/** The browse handler for the asset type whose folder this file sits in (or all types, at the root). */
export function defineBrowse<C = Record<string, string>>(
  run: (args: BrowseArgs, ctx: ToolContext<C>) => Promise<BrowseResult> | BrowseResult,
) {
  return { __daslab: "browse" as const, run };
}

/** A view rendered from a pinned asset (the in-app runtime supplies callTool). */
export function defineView(
  render: (args: {
    asset: { name?: string; external_id?: string; fields: Record<string, unknown> };
    callTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  }) => Promise<string> | string,
) {
  return { __daslab: "view" as const, render };
}
