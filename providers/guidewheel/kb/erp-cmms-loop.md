---
title: "Closing the ERP/CMMS loop"
summary: "The two integration patterns — planned orders in / actuals out, and downtime issue to work order with status write-back — as agent flows."
---

# Closing the ERP/CMMS loop with Guidewheel

Guidewheel documents two integration patterns. Both are one-directional pipes in most deployments; a Daslab agent turns them into closed loops.

## Pattern 1 — Planned orders in, actuals out (ERP)

**The pipe:** push planned orders from the ERP into Guidewheel; pull actuals — good units, scrap, runtime — back out to reconcile.

**As an agent flow:**

1. `guidewheel_list_production_entries` (unix-ms `from_ts`/`to_ts`) + `guidewheel_list_scraps` (ISO 8601 `from`/`to` — a different convention on purpose) over the last shift. `guidewheel_list_shifts` returns shift *definitions* with start and end clock times, not occurrences, so derive the concrete window from those.
2. Match entries to orders by SKU (`guidewheel_list_skus` — the ERP is the source of truth for SKUs; `guidewheel_create_sku` syncs new ones in).
3. Post confirmations into the ERP with that system's provider — e.g. production order confirmations in SAP S/4HANA via Daslab's SAP tools.
4. Write the ERP document number back onto the Guidewheel side where useful.

OEE reporting is the same read set: uptime (`guidewheel_get_device_uptime`, `group_by=day`) × production entries × scrap, computed in the agent — Guidewheel has no computed-OEE endpoint. Uptime hands you availability directly in `computedLoadStates.percentages`, and each production entry carries its own `oee` block, so the agent mostly has to reconcile rather than derive from scratch.

## Pattern 2 — Downtime issue → work order, status back (CMMS)

**The pipe:** when a machine goes down, create a work order in the CMMS; sync its status back.

**As an agent flow:**

1. Poll `guidewheel_list_issues` for new downtime events (no webhooks — schedule the poll, and size the interval against the 1000 calls/day budget).
2. Triage with context: the machine (`guidewheel_list_devices`), its recent load states (`guidewheel_get_device_state` for one machine, or `guidewheel_get_load_states` for the whole fleet in a single call), the tagged reason from the issue's `tags[].tagname`, and prior issues on the same `deviceid`.
3. Create the maintenance object in the target system — a CMMS work order, or a maintenance notification in the ERP.
4. **Write back:** `guidewheel_update_issue` with the work-order number and status, so the floor view and the maintenance system stay aligned. Issues are full CRUD precisely for this.

## Why an agent instead of a point integration

The glue work between the two systems — matching a downtime reason to a damage code, deciding whether a 4-minute idle is worth a work order, reconciling a shift's entries against an order — is judgment, not mapping. A Daslab scene holds both connections (Guidewheel + the ERP/CMMS) as assets, and the agent applies that judgment per event, with every write gated by the scene's approval rules.

## Practical notes

- **Timestamps:** two conventions that are not interchangeable — unix epoch milliseconds as `from_ts`/`to_ts` on load states, uptime, energy, issues and production entries; ISO 8601 strings as `from`/`to` on telemetry and scraps. The wrong one returns a 400.
- **Multiple tenants:** each Guidewheel account asset is one tenant, and tools resolve the credential from the account in scope.
- **Schema drift:** field names vary by tenant configuration. If a documented parameter is rejected, probe the live surface with `guidewheel_api_get` and adapt — write tools take a passthrough `fields` object for exactly this reason.
- **No paging:** there is no `limit`/`page`/`offset` on any endpoint. Lists come back whole; narrow with a time range or filter client-side.
