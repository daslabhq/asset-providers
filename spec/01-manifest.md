# Asset Provider Manifest — `provider.json`

An **asset provider** is a folder of files. No build step, no SDK, no server
code — a JSON manifest plus plain tool and view files:

```
acme/
├── provider.json            # the manifest — everything is declared here
├── tools/
│   ├── acme_search.ts       # code tool (body-style; reads ctx.input, returns a value)
│   └── browse.ts            # role:"browse" tool — feeds the asset picker
└── views/
    ├── preview.html         # a view: how a pinned asset draws (reads window.__ASSET__)
    └── preview.fixture.json # mock data for previewing the view
```

The Daslab server loads such folders directly — from a directory of providers
at boot, or per-workspace at runtime. The same file set works in both places.

## Top-level fields

```jsonc
{
  "id": "acme",                 // globally unique, lowercase, no hyphens
  "name": "Acme",
  "icon": "shippingbox.fill",   // SF Symbols name
  "color": "FF6B35",            // 6-char hex, no '#'
  "auth": { "type": "api_key", "credentialField": "api_key" },  // or { "type": "none" }
  "account": {                  // connection UX for api_key providers
    "keyDescription": "From https://acme.example/settings/api",
    "dashboardUrl": "https://acme.example/settings/api",
    "fields": [                 // optional: a multi-field credential instead of one key
      { "id": "api_key",    "label": "API Key",    "secret": true, "required": true },
      { "id": "company_id", "label": "Company ID", "required": true,
        "description": "Sent as the company_id header" }
    ]
  },
  "knowledge": {                // optional: guides shipped with the provider, see below
    "docs": [{ "slug": "getting-started", "title": "Getting started", "summary": "…" }]
  },
  "logo": { "type": "brandfetch", "domain": "acme.example" },
  //     | { "type": "simpleIcons", "slug": "acme" }
  //     | { "type": "url", "url": "https://..." }
  "website": {                  // catalog/directory metadata
    "tagline": "Widget management for teams",
    "description": "…",
    "category": "productivity",
    "useCases": ["…"],
    "public": true,
    "docsUrl": "https://docs.acme.example"
  },
  "contextMessage": "Acme is connected. Use acme_ tools to manage widgets.",
  "assetTypes": [ /* resource types — see below */ ],
  "tools":      [ /* see below */ ],
  "views":      [ /* see below */ ]
}
```

`auth.type` is `"api_key"` or `"none"` today. OAuth providers are not yet
expressible in this format.

With `account.fields`, the connect sheet shows exactly those fields (plus a
display name) and tools receive **every** account field as the credential —
`{credential.company_id}` in an `http_call`, `ctx.credential.company_id` in
code. Without it, the single `auth.credentialField` is the only field.

## Asset types

Assets are the core concept: everything a provider exposes — the account, the
resources you browse, the things tools operate on — is a typed asset that can
be pinned into a scene.

The **account type is synthesized** from `auth` + `account`; you never declare
it. `assetTypes` lists only the *resource* types:

```jsonc
{
  "id": "widget",               // bare id — the framework prefixes it ("acme_widget")
  "name": "Widget",
  "namePlural": "Widgets",
  "description": "A widget in your Acme account",
  "icon": "cube.fill",
  "parent": "…",                // optional parent type id, for hierarchies
  "hasSearch": true,            // show a search box in the asset picker
  "fields": [                   // what a pinned asset carries and displays
    { "key": "slug", "label": "ID", "type": "string" },
    { "key": "status", "label": "Status", "type": "string" },
    { "key": "page_url", "label": "Page", "type": "url" }
  ],
  "display": {                  // list/card templates — "{{key}}" interpolates fields
    "list": { "title": "{{name}}", "subtitle": "{{status}}" },
    "card": { "subtitle": ["{{status}}"] }
  }
}
```

A resource asset's field values come from the browse tool's `metadata` (below):
what browse returns is what a pinned asset knows about itself.

A type may also declare a **tile** — how a pinned asset shows up natively in
the app, rendered from its fields with no code and no network:

```jsonc
"tile": { "type": "image", "url": "https://cdn.example/{fields.slug}.png", "title": "{name}" }
// or
"tile": { "type": "metric", "value": "{fields.reading}", "label": "{fields.unit}", "color": "00D395" }
```

`{fields.x}`, `{name}` and `{external_id}` interpolate; a tile whose fields
are missing renders nothing rather than a broken value. Tiles and views
coexist: the tile is the native card, the view is the full HTML rendering.

A provider may declare `"envFallback": { "envVar": "ACME_API_KEY" }` at the
top level: where that server variable is set, a default account exists
without anyone entering a key. It is ignored where the variable is absent.

## Tools

```jsonc
{
  "name": "acme_search",        // {provider}_{verb}_{noun}
  "description": "Search Acme widgets by name or status.",
  "readOnly": true,
  "requiresApproval": false,    // true on writes that must pause for a human
  "role": "general",            // omit for LLM tools; "browse" for the asset picker
  "inputSchema": {              // JSON Schema, type: "object"
    "type": "object",
    "properties": { "query": { "type": "string", "description": "Search query" } },
    "required": ["query"]
  },
  "impl": { … }                 // http_call or code — see below
}
```

### Roles

- **(none) / `"general"`** — a normal tool, advertised to the AI.
- **`"browse"`** — powers the visual asset picker; *not* advertised to the AI.
  It receives `{ type, search, accountId, parentId }` as input — `type` is the
  bare asset-type id being browsed — and must return:

  ```jsonc
  {
    "items": [
      {
        "id": "widget-123",       // the resource's native id
        "name": "My Widget",
        "description": "subtitle shown in the picker",
        "metadata": { "slug": "widget-123", "status": "active" }
        // metadata keys become the pinned asset's fields
      }
    ]
  }
  ```

Reserved for future use: `enrich`, `health`, `create`, `edit`, `delete`.

### `http_call` impl — declarative REST

Prefer this whenever the tool is one HTTP request. It is auditable at a
glance, which matters for review:

```jsonc
{
  "kind": "http_call",
  "method": "GET",
  "url": "https://api.acme.example/search",
  "query":   { "q":             { "from": "input", "key": "query" } },
  "headers": { "Authorization": { "from": "credential", "key": "api_key" } },
  "output":  { "path": "$.results", "wrap": "json" }   // optional extraction
}
```

Values are templates: `{ "literal": "x" }`, `{ "from": "input", "key": "…",
"optional": true }`, or `{ "from": "credential", "key": "…" }`. A plain string
may also carry `{input.x}` / `{credential.y}` tokens and interpolates in
place — `"authorization": "Bearer {credential.api_key}"` — in the URL
(URL-encoded), headers, query, and body (verbatim). A token that resolves to
nothing fails the call; use the object form with `optional` for inputs that
may be absent.

Writes carry `"requiresApproval": true`: the job pauses for a human before
the call runs, exactly as native integrations do.

### `code` impl — a function body

For anything beyond one request — pagination, client-side filtering, response
shaping:

```jsonc
{ "kind": "code", "entry": "tools/acme_search.ts", "timeoutMs": 20000 }
```

The entry file is a **function body**, not a module (default timeout 10s):

```js
// Reads ctx.input / ctx.credential; `return`s a JSON-serializable value.
const query = String(ctx.input.query || "");
const resp = await fetch("https://api.acme.example/search?q=" + encodeURIComponent(query), {
  headers: { Authorization: "Bearer " + ctx.credential.api_key },
});
if (!resp.ok) throw new Error("Acme API " + resp.status);
return await resp.json();
```

Rules:

- `ctx.input` — the tool call's arguments. `ctx.credential` — the connected
  account's fields (empty for `auth: none`). `fetch` is global.
- `throw` for errors; the message reaches the caller.
- Code runs in an isolated subprocess with a hard timeout.

### Module-style tools (shared code)

When several tools share a client, write them as modules instead of bodies:
a file that `export default`s the handler may `import` any other file in the
provider folder. The handler receives `(input, ctx)` — the same `ctx` as
above.

```
acme/
├── lib/client.ts        # shared: request(), error glosses, decoders
└── tools/
    ├── acme_list.ts     # import { request } from "../lib/client"
    └── acme_create.ts   #   export default async function (input, ctx) { … }
```

```ts
import { request } from "../lib/client";

export default async function (input: any, ctx: any) {
  return request(ctx.credential, "/widgets", { query: { q: input.query } });
}
```

The two styles are told apart by `export default`: a file without it is a
body; a file with it is a module. Modules are bundled at first run; both
execute under the same contract, and `cli/run.ts` runs either.

## Views

A **view** is how a pinned asset draws — a self-contained HTML file that reads
its asset's fields from `window.__ASSET__`:

```jsonc
"views": [
  { "assetType": "acme_widget", "render": "views/preview.html", "fixture": "views/preview.fixture.json" }
]
```

The fixture is mock field data for previewing the view without a live asset
(convention: `<view>.fixture.json` next to the HTML). Keep views dependency-free:
inline CSS/JS, no external scripts.

## Knowledge docs

A provider can ship its own guides — setup, scope, troubleshooting — as
markdown next to the manifest:

```
acme/
├── provider.json       # "knowledge": { "docs": [{ "slug": "getting-started", … }] }
└── docs/
    └── getting-started.md
```

Each entry's `slug` names `docs/{slug}.md`. The guides surface in three
places at once: the integration's page, the agent's `docs_*` tools (readable
in any scene, before the provider is even connected), and as a pinnable doc
asset.

## Naming conventions

| What | Rule | Example |
|------|------|---------|
| Provider id | lowercase, no hyphens | `polyhaven`, `acme` |
| Asset type id | bare, lowercase, underscores OK | `hdri`, `pull_request` |
| Tool name | `{provider}_{verb}_{noun}` | `acme_list_widgets` |
| Icon | SF Symbols name | `cube`, `sun.max.fill` |
| Color | 6-char hex without `#` | `FF6B35` |

## Current limitations

- `auth`: `api_key` and `none` only — no OAuth yet.
- Code tools are single-file bodies — no imports.
- One account type per provider, always synthesized.
- Views power previews and declare the asset's render surface; native in-app
  rendering of custom views is not yet live.
