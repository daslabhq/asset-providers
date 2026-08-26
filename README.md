# Daslab Asset Providers

An **asset provider** connects an external service to [Daslab](https://daslab.run): the resources the service holds become typed, browseable assets, and the tools an agent uses on them ship in the same folder. A provider is a Daslab scene exported to disk: one `scene.json`, one folder per asset type, a knowledge base of markdown. Nothing is listed twice. Tools, browse, views and guides are discovered from the tree, and a tool's metadata lives in its own source file.

```
providers/kenko/
├── scene.json                      # identity + the provider block
├── lib/client.ts                   # the API client, once
├── assets/
│   ├── account/
│   │   ├── asset.json              # credential fields, dashboardUrl
│   │   └── tools/list_centers.ts   # account-scoped tools
│   ├── schedule/                   # "Class"
│   │   ├── asset.json              # name, fields, display, tile
│   │   └── tools/list_schedules.ts # defineTool({ …meta, run }), 15 lines; the filename is the tool name
│   ├── contact/ …                  # "Member"
│   └── booking/ …                  # parent: contact
├── browse.ts                       # feeds the asset picker
└── kb/
    └── partner-api.md              # the knowledge base
```

## Resources become assets you can browse, pin, and see

Most integration formats describe functions. This one also describes the things the functions work on. Every asset type declared in the manifest appears in Daslab's asset picker, so a person can find a resource by name instead of the agent guessing ids.

The `polyhaven` example makes this concrete. It declares three asset types over Poly Haven's CC0 library: HDRIs, PBR textures, and 3D models, about 2,300 in all. In Daslab you search the picker for "concrete floor" and pin the texture into a scene. Every workflow becomes a scene — its data, its tools, the agent that runs it, and the history of everything it did. The pinned texture carries the fields the provider declared (slug, tags, resolution), draws itself through the provider's view, and when the agent needs the actual image maps, `polyhaven_files` resolves the download URLs. No key is needed anywhere in that path.

## The examples cover the format

| Provider | Auth | Shows |
|----------|------|-------|
| [`timezone`](providers/timezone/) | none | The minimal provider: one code tool, one live clock view |
| [`brave`](providers/brave/) | api_key | A provider in one file: a single `http_call` tool with the credential templated into a header |
| [`chatcone`](providers/chatcone/) | api_key | A real SaaS integration with zero code: multi-field credentials, four `http_call` tools on two API surfaces, an approval-gated write, and shipped guides |
| [`kenko`](providers/kenko/) | api_key | **The scene layout**: `scene.json`, one folder per asset type with its `defineTool` modules over a shared `lib/client.ts`, approval-gated writes, a browse that makes classes, members and bookings pinnable, a `kb/` of guides |
| [`guidewheel`](providers/guidewheel/) | api_key | **A tenant-hosted API**: the base URL is itself a credential field, writes are approval-gated, and every tool takes a passthrough so an agent can adapt when the field-level guide is request-only |
| [`openmeteo`](providers/openmeteo/) | none | `http_call` tools plus one asset type: pin a location, its view shows the weather right now |
| [`polyhaven`](providers/polyhaven/) | none | The full asset model: three types, searchable browse, typed fields, display templates, one view per type |
| [`polymarket`](providers/polymarket/) | none | Hierarchy: markets nest under events, browse with search, a market view that fetches live odds |

All of them pass the validator and load into a Daslab server unchanged.

## Write one by copying an example

Start from `kenko` (the scene layout) and rename the folder. [The spec](spec/01-manifest.md) covers every file; the short path:

1. `scene.json`: name, icon, and the `provider` block with id and auth. The format covers API-key and keyless services; OAuth is not expressible in it.
2. `assets/account/asset.json`: the credential fields the connect sheet shows. Tools receive all of them as `ctx.credential`.
3. One folder per resource type under `assets/`, each with an `asset.json` (fields, display, tile) and its `tools/`.
4. Write the tools. A tool is one file, `export default defineTool({ name, description, input, run })`, importing the SDK and your own `lib/`. A tool that is one HTTP request needs no code at all: a `*.http.json` with the templated call.
5. Add `browse.ts` in a type's folder (or one at the root) so the asset picker has something to show; drop guides in `kb/` as markdown.

The older `provider.json` layout still loads; `bun cli/migrate.ts <folder>` rewrites one into the scene layout.

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
