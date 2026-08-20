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
    "dashboardUrl": "https://acme.example/settings/api"
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

## Tools

```jsonc
{
  "name": "acme_search",        // {provider}_{verb}_{noun}
  "description": "Search Acme widgets by name or status.",
  "readOnly": true,
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
"optional": true }`, or `{ "from": "credential", "key": "…" }`.

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

- No `import`s — each tool file is self-contained.
- `ctx.input` — the tool call's arguments. `ctx.credential` — the connected
  account's credentials (empty for `auth: none`). `fetch` is global.
- `throw` for errors; the message reaches the caller.
- Code runs in an isolated subprocess with a hard timeout.

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
