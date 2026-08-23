# Asset Provider Spec - the scene layout

An **asset provider** is a folder. The folder is a Daslab scene exported to
disk: one `scene.json`, one folder per asset type, a knowledge base of
markdown, shared code. Nothing is listed twice - tools, browse, views and
guides are discovered from the tree, and a tool's metadata lives in its own
source file.

```
acme/
├── scene.json                       # identity + the provider block
├── lib/client.ts                    # shared code, imported by tools
├── assets/
│   ├── account/
│   │   ├── asset.json               # credential fields, dashboardUrl
│   │   └── tools/whoami.ts          # account-scoped tools
│   └── widget/
│       ├── asset.json               # name, fields, display, tile
│       ├── browse.ts                # feeds the asset picker for widgets
│       ├── view.html                # how a pinned widget draws
│       └── tools/
│           ├── search.ts            # a tool: defineTool({ …meta, run })
│           └── ping.http.json       # a no-code tool: one templated request
└── kb/
    └── getting-started.md           # the knowledge base
```

## scene.json

```jsonc
{
  "name": "Acme",
  "icon": "shippingbox.fill",       // SF Symbols name
  "color": "FF6B35",                // 6-char hex, no '#'
  "logo": { "type": "brandfetch", "domain": "acme.example" },
  "website": {
    "tagline": "Widget management for teams",
    "description": "…",
    "category": "productivity",
    "useCases": ["…"],
    "public": true,
    "docsUrl": "https://docs.acme.example"
  },
  "provider": {
    "id": "acme",                          // globally unique, lowercase, no hyphens
    "auth": { "type": "api_key" },         // or { "type": "none" }
    "envFallback": { "envVar": "ACME_API_KEY" },   // optional: a default account where that server var is set
    "contextMessage": "Acme is connected. Use acme_ tools to manage widgets.",
    "instructionText": "Enter the API key from Acme → Settings → API."
  }
}
```

`provider.auth.type` is `"api_key"` or `"none"`. OAuth is not yet
expressible.

## assets/&lt;type&gt;/asset.json

Every folder under `assets/` is an asset type; its name is the type id
(lowercase, underscores OK). `account` is the connection; the rest are the
resources a person browses and pins.

```jsonc
// assets/account/asset.json - the connection
{
  "name": "Workspace",
  "fields": [                             // the connect sheet shows exactly these
    { "id": "api_key",    "label": "API Key",    "secret": true, "required": true },
    { "id": "company_id", "label": "Company ID", "required": true,
      "description": "Sent as the company_id header" }
  ],
  "dashboardUrl": "https://acme.example/settings/api"
}
```

```jsonc
// assets/widget/asset.json - a resource type
{
  "name": "Widget",
  "namePlural": "Widgets",
  "description": "A widget in your Acme workspace",
  "icon": "cube.fill",
  "parent": "…",                 // optional parent type id
  "hasSearch": true,             // a search box in the picker
  "fields": [                    // what a pinned asset carries and displays
    { "key": "slug", "label": "ID", "type": "string" },
    { "key": "status", "label": "Status", "type": "string" }
  ],
  "display": { "list": { "title": "{{name}}", "subtitle": "{{status}}" } },
  "tile": { "type": "image", "url": "https://cdn.acme.example/{{fields.slug}}.png", "title": "{{name}}" }
  // or "tile": { "type": "metric", "value": "{{fields.reading}}", "label": "{{name}}" }
}
```

Tools receive every account field as the credential:
`ctx.credential.company_id` in code, `{{credential.company_id}}` in an
`http_call`. A tile is the pinned asset's native card, rendered from its
fields with no code; a tile whose fields are missing renders nothing.

## Tools

A tool is one file under `assets/<type>/tools/`. Its name defaults to
`{provider}_{file}_{type}` (`widget/tools/search.ts` → `acme_search_widget`;
account tools drop the type) - set `name` to pin the agent's contract.

### Module tools - metadata in the source

```ts
// assets/widget/tools/search.ts
import { defineTool } from "@daslabhq/asset-provider";
import { request } from "../../../lib/client";

export default defineTool({
  name: "acme_search_widgets",
  description: "Search Acme widgets by name or status.",
  readOnly: true,
  input: { query: { type: "string", description: "Search query" } },   // shorthand for inputSchema.properties
  required: ["query"],
  async run(input, ctx) {
    return request(ctx.credential, "/search", { query: { q: input.query } });
  },
});
```

- `import` anything in the provider folder; the tool is bundled at load.
- `ctx.input`, `ctx.credential` (all account fields), `ctx.fetch`.
- `requiresApproval: true` on writes pauses the job for a human.
- `throw` for errors; the message reaches the caller.
- Code runs in an isolated subprocess with a hard timeout. Module top
  levels must be side-effect free - they run once when metadata is read.
- A file without `export default` is a **body** (statements reading
  `ctx.input`, ending in `return`); it needs a `*.meta.json` sibling
  carrying name/description/input.

### No-code tools - `*.http.json`

```jsonc
// assets/widget/tools/ping.http.json
{
  "description": "Ping the Acme API.",
  "readOnly": true,
  "input": { "region": { "type": "string" } },
  "method": "GET",
  "url": "https://api.acme.example/ping",
  "query":   { "region": "{{input.region?}}" },
  "headers": { "authorization": "Bearer {{credential.api_key}}" },
  "output":  { "path": "$.result", "wrap": "json" }
}
```

One template syntax everywhere: `{{input.x}}`, `{{credential.y}}`,
`{{fields.z}}` (tiles), `{{name}}` (display). `{{input.x?}}` is optional:
a value that is exactly one optional token and resolves to nothing drops the
key; embedded, it renders empty. A missing required token fails the call.
(Single-brace `{input.x}` and `{ "from": "input", "key": "x" }` object
templates still work.)

### Browse - `assets/<type>/browse.ts`

```ts
import { defineBrowse } from "@daslabhq/asset-provider";

export default defineBrowse(async ({ search, parentId }, ctx) => ({
  items: (await list(ctx.credential, search)).map((w) => ({
    id: w.id, name: w.name, description: w.status,
    metadata: { slug: w.id, status: w.status },   // becomes the pinned asset's fields
  })),
}));
```

`{ type, search, accountId, parentId }` in; `{ items }` out. A root
`browse.ts` may serve every type by switching on `type`.

## Views - `assets/<type>/view.html`

A self-contained HTML file reading the pinned asset's fields from
`window.__ASSET__`; an optional `view.fixture.json` beside it is mock data
for previewing. Inline CSS/JS, no external scripts.

## Knowledge base - `kb/*.md`

Every markdown file in `kb/` is a guide: slug from the filename (lowercase
kebab), title from the first `# heading` or front matter, `summary:` in
front matter. Guides render on the integration's page, are readable by the
agent in any scene, and can be pinned as an asset.

## Naming

| What | Rule | Example |
|------|------|---------|
| Provider id | lowercase, no hyphens | `polyhaven`, `acme` |
| Asset type folder | lowercase, underscores OK | `hdri`, `pull_request` |
| Tool name | `{provider}_{verb}_{noun}` | `acme_list_widgets` |
| Icon | SF Symbols name | `cube`, `sun.max.fill` |
| Color | 6-char hex without `#` | `FF6B35` |

## Current limitations

- `auth`: `api_key` and `none` only.
- One account type per provider.
- Views power previews and declare the asset's render surface; native
  in-app rendering of custom views is not yet live (tiles are).

## Legacy: the v1 `provider.json` layout

Folders with a `provider.json` listing `tools[]` (with `impl.entry` or
inline `http_call`), `assetTypes[]`, `views[]` and `knowledge.docs[]`, and
`tools/`, `views/`, `docs/` folders, keep loading unchanged.
`bun cli/migrate.ts <folder>` rewrites one into the scene layout; the
remaining examples migrate over time.
