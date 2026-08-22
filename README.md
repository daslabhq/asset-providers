# Daslab Asset Providers

An **asset provider** connects an external service to [Daslab](https://daslab.run): the resources the service holds become typed, browseable assets, and the tools an agent uses on them ship in the same folder. There is no SDK and no build step. A provider is a JSON manifest, plain tool files, and an HTML view:

```
providers/polyhaven/
├── provider.json          # identity, asset types, tools, views
├── tools/
│   ├── polyhaven_search.ts
│   ├── polyhaven_files.ts
│   ├── polyhaven_info.ts
│   └── browse.ts          # feeds the visual asset picker
└── views/
    ├── preview.html       # how a pinned asset draws itself
    └── preview.fixture.json
```

## Resources become assets you can browse, pin, and see

Most integration formats describe functions. This one also describes the things the functions work on. Every asset type declared in the manifest appears in Daslab's asset picker, so a person can find a resource by name instead of the agent guessing ids.

The `polyhaven` example makes this concrete. It declares three asset types over Poly Haven's CC0 library: HDRIs, PBR textures, and 3D models, about 2,300 in all. In Daslab you search the picker for "concrete floor" and pin the texture into a scene. Every workflow becomes a scene — its data, its tools, the agent that runs it, and the history of everything it did. The pinned texture carries the fields the provider declared (slug, tags, resolution), draws itself through the provider's view, and when the agent needs the actual image maps, `polyhaven_files` resolves the download URLs. No key is needed anywhere in that path.

## Six examples cover the format

| Provider | Auth | Shows |
|----------|------|-------|
| [`timezone`](providers/timezone/) | none | The minimal provider: one code tool, one live clock view |
| [`brave`](providers/brave/) | api_key | A provider in one file: a single `http_call` tool with the credential templated into a header |
| [`chatcone`](providers/chatcone/) | api_key | A real SaaS integration with zero code: multi-field credentials, four `http_call` tools on two API surfaces, an approval-gated write, and shipped guides |
| [`openmeteo`](providers/openmeteo/) | none | `http_call` tools plus one asset type: pin a location, its view shows the weather right now |
| [`polyhaven`](providers/polyhaven/) | none | The full asset model: three types, searchable browse, typed fields, display templates, one view per type |
| [`polymarket`](providers/polymarket/) | none | Hierarchy: markets nest under events, browse with search, a market view that fetches live odds |

All five pass the validator and load into a Daslab server unchanged.

## Write one by copying an example

Start from the example closer to what you're building and rename the folder. [The manifest spec](spec/01-manifest.md) covers every field; the short path:

1. Declare identity and auth in `provider.json`. The format covers API-key and keyless services; OAuth is not expressible in it.
2. Declare your resource types with their fields and display templates.
3. Write the tools. Use `http_call` when a tool is one HTTP request: it is declarative, and a reviewer can read it at a glance. Use a `code` body when you need logic; each body is a self-contained file that reads `ctx.input` and returns a value.
4. Add one tool with `role: "browse"` so the asset picker has something to show.
5. Give your types a view: an HTML file that reads `window.__ASSET__`, next to a fixture of mock fields for previewing it.

Then check your work:

```bash
bun cli/validate.ts providers/yourprovider
bun cli/run.ts providers/yourprovider yourprovider_search '{"query":"test"}'
```

The validator checks the manifest, the entry files, and the naming rules, and tells you exactly what's missing. The runner executes one tool locally against the real API, under the same contract the server runs it with; pass `--credential api_key=...` when the provider needs one.

Then push it into your own Daslab workspace and use it for real:

```bash
daslab provider push providers/yourprovider
```

The push is scoped to your workspace, validated before anything is written, and re-pushing updates it. Your provider is usable there on the next message.

## A merged provider goes live in the app

Providers merged here ship in Daslab as community integrations, which is why review is strict: a merged provider runs with the same standing as one we wrote. Prefer `http_call` impls, which can be audited at a glance. A `code` body gets read line by line: keep it self-contained, and let errors throw rather than swallowing them.

MIT licensed.
