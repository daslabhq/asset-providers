---
title: "Data model & endpoint map"
summary: "Verified against the live API: what the current-sensor signal yields, the two incompatible time conventions, the real paths and field names, and the gaps to plan around."
---

# Guidewheel data model & endpoint map

Everything below was checked against a live tenant, not inferred from the marketing docs.

## Where the data comes from

Guidewheel's core sensor is a **non-invasive clip-on current transducer (CT clamp)** around a machine's power line — no PLC integration, no network port on the machine. From that single current signal the platform derives:

- **Load states** — `online` (running), `idle`, `offline` (down), planned downtime, `noData`
- **Cycles and cycle time**
- **Energy** — per-second active power; other metrics per-minute

On top of the sensed signal sit operator- and platform-generated records: downtime **issues** with tagged reasons, **production entries**, **scrap** events, **shifts**, and **tags** (standardized reason codes).

Knowing this genealogy matters: everything state-like is inferred from power draw — robust, but blind to machine internals like alarm codes or process parameters — while issues, production and scrap are human- or rule-entered records with the usual bookkeeping caveats.

## Two time conventions, and they are not interchangeable

The API rejects the wrong one with a 400. There is no endpoint that accepts both.

| Convention | Parameters | Endpoints |
|---|---|---|
| **Unix epoch milliseconds** (number) | `from_ts` / `to_ts` | load states, uptime, energy, issues, production entries |
| **ISO 8601 string** | `from` / `to` | telemetry, scraps |

`group_by=day` is accepted only on uptime and energy. **There is no `limit`, `page`, or `offset` parameter anywhere** — list endpoints return everything, and filtering is the caller's job. Every endpoint takes an optional `company_id`.

## Entities and their real field names

| Entity | Identity field | Notable fields |
|---|---|---|
| Device | `deviceid` (a string like `acme_press4_prs4`) | `nickname` is the human name, `status`, `thresholds[]`, `target` |
| Load state span | — | `start`, `end` (unix ms), `state`, `color` |
| Issue | `id` (uuid) | `deviceid`, `status`, `startedAt`, `issuetype`, `tags[].tagname` is the downtime reason, `comments.action`, `changelog[]` |
| Production entry | `id` | `device_id`, quantities, waste, a computed `oee` block |
| SKU | `id` | `companyid`, `skucode`, `status` |
| Tag | `id` | `tagname`, `tagcolor`, `tagtype`, `tagplanned` |
| Shift | `id` | `name`, `startTime`, `endTime`, `minutesFromMidnight`, `durationMinutes`, `crossesMidnight`, `status` |
| Device list | `id` | `name`, `devices[]` — and a site-level list's id **is** the plant id |
| Scrap | `id` | `device_id` |

Field naming is inconsistent across endpoints (`companyid` vs `companyId`, `deviceid` vs `device_id`); take each entity as it comes.

## Response envelopes

Also inconsistent, so unwrap defensively:

- Most endpoints: `{ "data": [ … ] }`
- `/skus` and device energy: a **bare array**
- **Load states**: `{ "data": { "<deviceid>": [ …spans ] } }` — an object keyed by device, not a list

## Endpoints (`/api/v1`)

| Path | Verbs | Notes |
|---|---|---|
| `/devices` | GET, POST | the roster |
| `/devices/{id}` | GET | one machine |
| `/devices/loadStates` | GET | **every** machine in one call — prefer this |
| `/devices/{id}/loadStates` | GET | one machine |
| `/devices/{id}/uptime`, `/devices/uptime` | GET | `group_by=day`; returns `computedLoadStates.percentages` incl. availability |
| `/devices/{id}/energy`, `/devices/energy` | GET | `group_by=day` |
| `/devices/{id}/telemetry` | GET | requires `metric`, `granularity` (`minute`\|`second`), ISO `from`/`to` |
| `/devices/{id}/thresholds-changes` | GET | note the plural `thresholds-` |
| `/issues` | GET, POST | `from_ts`/`to_ts`, `updated`, `comments` |
| `/issues/{id}` | GET, PATCH, DELETE | PATCH is the write-back hook |
| `/issues/{issueId}/comments` | POST | |
| `/issues/{issueId}/tags/{tagId}` | PUT, DELETE | |
| `/production-entries` | GET, POST, DELETE | `sku`, `device_id` filters |
| `/production-entries/{id}` | GET, PUT | note **PUT**, not PATCH |
| `/production-entries/upload`, `/csv/status` | POST, GET | bulk CSV |
| `/skus`, `/skus/{id}` | GET, POST / GET | |
| `/tags` | GET, POST | |
| `/device-lists`, `/device-lists/{id}` | GET | |
| `/plants/{plantId}/current-shift` | GET | plantId is a positive integer — a device-list id |
| `/plants/{plantId}/schedule` | GET | |
| `/shifts` | GET | definitions, not occurrences; `status` is `A` or `D` |
| `/scraps` | GET, POST | ISO `from`/`to` **required** |
| `/metrics`, `/metrics/all`, `/metrics/device_metrics` | GET, POST | undocumented in the vendor guide |

**There is no `/plants` list endpoint** and no `/devices/{id}/state` — a natural-looking guess that returns 404.

## Gaps to plan around

- **No webhooks or streaming.** Everything is polled. Reacting to downtime needs a polling loop against the 1000 calls/day budget — use `/devices/loadStates` to cover the whole fleet in one request rather than one call per machine.
- **No computed-OEE endpoint.** Uptime gives availability via `computedLoadStates.percentages`; combine with production entries and scrap for the rest. Production entries do carry a per-entry `oee` block.
- **No alert-rule or anomaly-output API.** Alert configuration and anomaly detection are platform-UI features; their outputs surface only as issues.
- **Production entries degrade with range width.** No paging, and the endpoint slows sharply as the window grows — roughly 2s for a shift, 4s for a day, 11s for three days, and a seven-day range has been seen to fail with a bodyless 500. Read shift by shift, not week by week.
- **Schemas are tenant-flavored.** Field names vary with tenant configuration, and the field-level guide is distributed on request. Every read tool takes a passthrough, every write tool takes a `fields` object, and `guidewheel_api_get` probes any path so an agent can learn the live surface empirically.
