/**
 * Guidewheel FactoryOps API client.
 *
 * REST over HTTPS under `/api/v1`, JSON in and out. Auth is an API key in the
 * `x-api-key` header; both the key and the base URL are tenant-specific and
 * issued by Guidewheel, because there is no self-serve developer portal.
 *
 * Two time conventions coexist and are NOT interchangeable — the API rejects
 * the wrong one outright:
 *   `from_ts` / `to_ts`  unix epoch milliseconds — loadStates, uptime, energy,
 *                        issues, production-entries
 *   `from` / `to`        ISO 8601 strings       — telemetry, scraps
 * Each tool passes the pair its own endpoint documents; this module does not
 * guess between them.
 *
 * Response envelopes are inconsistent: most endpoints wrap in `{ data }`,
 * `/skus` returns a bare array, and `/devices/loadStates` returns an object
 * keyed by device id. `asArray` copes with the first two; load states are
 * keyed and should be read with `asKeyedSeries`.
 *
 * Rate limits are 1000 calls/day and 50 calls/min per tenant, and there are no
 * webhooks — the API is pull-only — so callers should poll modestly.
 */

export interface GuidewheelCredential {
  base_url: string;
  api_key: string;
  company_id?: string;
  display_name?: string;
}

/** A GET under `/api/v1`. `query` carries the endpoint's own parameter names. */
export function read(
  credential: GuidewheelCredential,
  path: string,
  query: Record<string, unknown> = {},
): Promise<any> {
  return request(credential, "GET", path, query);
}

/** A raw GET under `/api/v1` — the schema-discovery escape hatch. */
export function rawGet(
  credential: GuidewheelCredential,
  path: string,
  query?: Record<string, unknown>,
): Promise<any> {
  return request(credential, "GET", path, query ?? {});
}

/** A write with a passthrough JSON body; field names are tenant-specific. */
export function write(
  credential: GuidewheelCredential,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: Record<string, unknown>,
  query: Record<string, unknown> = {},
): Promise<any> {
  return request(credential, method, path, query, body);
}

/** Reject an empty/missing required argument with the tool-facing message. */
export function required(value: unknown, name: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

/** Reject a write body that would send nothing. */
export function requiredFields(fields: unknown, name = "fields"): Record<string, unknown> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.keys(fields).length === 0) {
    throw new Error(`${name} must be a non-empty object`);
  }
  return fields as Record<string, unknown>;
}

/** Lists arrive bare or wrapped in `{ data }` — unwrap either way. */
export function asArray(payload: any): Array<Record<string, any>> {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["data", "devices", "issues", "results", "items", "records"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

/** `{ data: { "<deviceid>": [...] } }` — the load-states shape. */
export function asKeyedSeries(payload: any): Record<string, Array<Record<string, any>>> {
  const inner = payload && typeof payload === "object" ? (payload.data ?? payload) : null;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return {};
  return inner as Record<string, Array<Record<string, any>>>;
}

/** First present value among candidate keys — field names vary by tenant. */
export function pickField(record: Record<string, any> | null | undefined, keys: string[]): any {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] != null && record[key] !== "") return record[key];
  }
  return undefined;
}

/** ISO 8601 for the `from`/`to` endpoints; passes through a string unchanged. */
export function isoTime(value: unknown, fallbackMsAgo?: number): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return new Date(value).toISOString();
  if (fallbackMsAgo == null) return undefined;
  return new Date(Date.now() - fallbackMsAgo).toISOString();
}

// ════════════════════════════════════════════════════════════════════
// Transport
// ════════════════════════════════════════════════════════════════════

async function request(
  credential: GuidewheelCredential,
  method: string,
  path: string,
  query: Record<string, unknown>,
  body?: Record<string, unknown>,
): Promise<any> {
  const url = new URL(endpoint(credential, path));
  for (const [key, value] of Object.entries(withCompany(credential, query))) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }

  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": required(credential?.api_key, "api_key"),
      Accept: "application/json",
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(describeFailure(res.status, text));
  return safeJson(text);
}

/** Every endpoint accepts an optional company_id; send it when the account has one. */
function withCompany(
  credential: GuidewheelCredential,
  query: Record<string, unknown>,
): Record<string, unknown> {
  const company = String(credential?.company_id ?? "").trim();
  if (!company || "company_id" in query) return query;
  return { ...query, company_id: company };
}

/** `/devices` and `/api/v1/devices` both land on the tenant's `/api/v1/devices`. */
function endpoint(credential: GuidewheelCredential, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const prefixed = normalized.startsWith("/api/v1") ? normalized : `/api/v1${normalized}`;
  return `${normalizeBaseUrl(credential)}${prefixed}`;
}

/**
 * The tenant base URL is delivered with the key and pasted by hand, so accept
 * it with or without a scheme and with or without a trailing `/api/v1`.
 */
function normalizeBaseUrl(credential: GuidewheelCredential): string {
  let base = String(credential?.base_url ?? "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("No Guidewheel tenant base URL — set base_url on the account.");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base.replace(/\/api\/v1$/i, "");
}

function describeFailure(status: number, text: string): string {
  const parsed = safeJson(text);
  const raw = parsed?.message ?? parsed?.error?.message ?? parsed?.error ?? text.slice(0, 400);
  const detail = Array.isArray(raw) ? raw.join("; ") : typeof raw === "string" ? raw : JSON.stringify(raw);
  return `Guidewheel ${status}${statusHint(status)}: ${detail}`;
}

function statusHint(status: number): string {
  if (status === 429) return " (rate limited: 1000 calls/day, 50/min)";
  if (status === 401 || status === 403) return " (check the API key and that it is scoped to this company)";
  if (status === 404) return " (path not found — probe the surface with guidewheel_api_get)";
  return "";
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
