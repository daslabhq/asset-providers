# Daslab Asset Providers

Open integrations for [Daslab](https://daslab.run). An **asset provider**
connects an external service as **typed, browseable assets** plus the AI tools
that operate on them — declared as a folder of files, no server code and no
deploy.

```
providers/polyhaven/
├── provider.json          # manifest: identity, asset types, tools, views
├── tools/
│   ├── polyhaven_search.ts
│   ├── polyhaven_files.ts
│   ├── polyhaven_info.ts
│   └── browse.ts          # feeds the visual asset picker
└── views/
    ├── preview.html       # how a pinned asset draws
    └── preview.fixture.json
```

## The assets concept

Most integration frameworks give an AI a bag of functions. An asset provider
gives it — and the person working alongside it — **things**:

1. **Browse** — every resource type the provider declares shows up in a visual
   asset picker, searchable, with names and thumbnails. No id-guessing.
2. **Pin** — picking one turns it into an asset in your scene, carrying typed
   fields (`slug`, `tags`, `max_resolution`, …) declared in the manifest.
3. **Act** — the provider's tools are available to the AI in every
   conversation where the provider is connected, alongside the pinned assets
   they operate on.
4. **See** — an asset draws itself through the provider's **view**: a
   self-contained HTML file rendering the asset's fields.

The [Poly Haven provider](providers/polyhaven/) shows all four with zero auth:
three asset types (HDRIs, PBR textures, 3D models — ~2,300 CC0 assets),
searchable browse, three AI tools, and an image-preview view. An asset
provider whose assets are literally 3D assets.

## Examples

| Provider | Auth | Shows |
|----------|------|-------|
| [`timezone`](providers/timezone/) | none | Minimal: one code tool, one live view |
| [`polyhaven`](providers/polyhaven/) | none | The full asset model: 3 asset types, browse + search, typed fields, display templates, a preview view |

Planned next: an API-key example (credential templating in `http_call`) and a
market-data example (Polymarket).

## Authoring a provider

Read [the manifest spec](spec/01-manifest.md) — it covers every field. The
short version:

1. Copy an example folder and rename it.
2. Declare identity + `auth` in `provider.json`.
3. Declare your resource `assetTypes` with `fields` and `display`.
4. Write tools: `http_call` for single-request tools (preferred — auditable at
   a glance), `code` bodies for anything needing logic. Add one `role:
   "browse"` tool to power the asset picker.
5. Add a view (`views/*.html` reading `window.__ASSET__`) with a fixture.
6. Validate:

```bash
bun cli/validate.ts providers/yourprovider
```

## Contributing

PRs welcome. Two things reviewers hold the line on:

- **Merged providers run as first-party code.** Prefer `http_call` impls —
  they are declarative and reviewable at a glance. A `code` body gets real
  scrutiny: self-contained, no surprises, errors thrown not swallowed.
- **Scope**: `api_key` and keyless providers only for now — OAuth isn't
  expressible in the format yet.

## License

MIT.
