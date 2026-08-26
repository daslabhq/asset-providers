---
title: "Getting Guidewheel API access"
summary: "No developer portal — request the tenant base URL, company-scoped API key, and sandbox from Guidewheel; auth, rate limits, and environments."
---

# Getting Guidewheel API access

Guidewheel has no self-serve developer portal. API access is provisioned per company by Guidewheel, and three things arrive together:

1. **A tenant-specific base URL** — every company gets its own API host; there is no shared `api.guidewheel.com`.
2. **A company-scoped API key** — sent as the `x-api-key` request header. The key only sees data belonging to your company.
3. **Optionally, a sandbox tenant** — a separate base URL + key for testing, provided on request.

Ask your Guidewheel account contact (or [info@guidewheel.com](mailto:info@guidewheel.com)) for all three, plus their **detailed technical guide** — the public help-center docs list endpoints and verbs, but exact query parameters and response schemas are only shared on request. API access is part of Guidewheel's paid tiers (their "Open API" ships with Premium and above).

## Connecting in Daslab

Add a **Guidewheel Account** asset with the tenant base URL and API key. Paste the base URL exactly as issued — with or without a scheme, and with or without a trailing `/api/v1`; all four forms work. To confirm the credentials are good, call `guidewheel_list_devices` with `limit: 1`.

## Auth & transport

- REST over HTTPS, JSON request/response. CSV is supported on specific bulk-load endpoints (production entries).
- All endpoints live under `/api/v1`.
- API key in the `x-api-key` header. (An older `api_key` query parameter exists but is deprecated — don't use it.)

```bash
curl "https://<your-tenant-base-url>/api/v1/devices" \
  -H "x-api-key: $GUIDEWHEEL_API_KEY"
```

## Rate limits

**1000 calls per day and 50 calls per minute** per tenant. There are no webhooks — the API is pull-only — so budget your polling: a per-minute state poll on a single tenant already consumes the daily budget. Prefer time-range reads (`from_ts`/`to_ts`, unix milliseconds) over tight loops, and let one call cover many machines where the endpoint allows it.

## Timestamps

Most endpoints take `from_ts` / `to_ts` as unix epoch **milliseconds**; a few accept ISO 8601 strings (`2026-06-01T00:00:00.000Z`). If a range parameter is rejected, try the other form — the exact convention varies by endpoint.
