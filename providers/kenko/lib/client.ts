/**
 * Kenko Partner Public API client — shared by every tool in this provider.
 *
 * - Base: https://data.bookeeapp.com/api/public/v1 (Kenko is the former Bookee).
 * - Auth is one static header, `X-API-Key`; the key is per-center and shown
 *   once when the studio connects a partner. `X-Center-Id` is optional and,
 *   when sent, must match the key's center or Kenko answers 403 — so it is
 *   sent only when the operator pinned one.
 * - Collections come back as `{ data: [...], links, meta }`; single resources
 *   as `{ data: {...} }`. Errors are `{ message }` and the message text is the
 *   contract — surface it verbatim.
 * Spec: https://documenter.getpostman.com/view/29834338/2sBY4VJweq
 */

const API_BASE = "https://data.bookeeapp.com/api/public/v1";

/** Booking status codes — Kenko documents these as integers. */
export const BOOKING_STATUS: Record<number, string> = {
  1: "booked",
  2: "waitlist",
  3: "cancelled",
  4: "cancelled_by_contact",
  5: "waitlist_cancelled",
  6: "blocked",
  7: "failed",
};

export const PAYMENT_STATUS: Record<number, string> = {
  1: "paid",
  2: "unpaid",
  3: "failed",
  4: "refunded",
};

/** Kenko says "Instructor"/"Facility"; the booking endpoint wants these wire values. */
const BOOKABLE_TYPES: Record<string, "INSTRUCTOR" | "RESOURCE"> = {
  instructor: "INSTRUCTOR",
  facility: "RESOURCE",
  resource: "RESOURCE",
};

export interface Credential {
  api_key?: string;
  center_id?: string;
  [key: string]: unknown;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, unknown>;
  body?: unknown;
}

/** One request against the partner API; throws with Kenko's own message on error. */
export async function request(credential: Credential, path: string, opts: RequestOptions = {}): Promise<any> {
  if (!credential.api_key) throw new Error("Kenko API key is missing on the connected business.");
  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method || "GET",
    headers: buildHeaders(credential, opts.body !== undefined),
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const payload = await readJson(res);
  if (!res.ok) throw new Error(describeError(res.status, payload));
  return payload;
}

/** Unwrap Kenko's `{ data, links, meta }` envelope. */
export function unwrap(res: any): { data: any; meta: any } {
  return { data: res?.data ?? null, meta: res?.meta ?? null };
}

/** A collection as `{ <key>: rows, total }`. */
export function collection(res: any, key: string): Record<string, unknown> {
  const { data, meta } = unwrap(res);
  return { [key]: data, total: meta?.total ?? (Array.isArray(data) ? data.length : 0) };
}

/** Decode the integer status pair Kenko puts on every booking resource. */
export function decodeBooking(booking: any): any {
  if (!booking || typeof booking !== "object") return booking;
  return {
    ...booking,
    status_label: BOOKING_STATUS[booking.status] ?? `unknown(${booking.status})`,
    payment_status_label: PAYMENT_STATUS[booking.payment_status] ?? `unknown(${booking.payment_status})`,
  };
}

export function normalizeBookable(bookable: { type: string; bookable_id: string | number }) {
  const canonical = BOOKABLE_TYPES[String(bookable.type).toLowerCase()];
  if (!canonical) throw new Error(`Invalid bookable type "${bookable.type}" — expected instructor or facility.`);
  return { type: canonical, bookable_id: String(bookable.bookable_id) };
}

/** Input helpers shared by the tools: "" / null / undefined → undefined. */
export function str(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}
export function num(value: unknown): number | undefined {
  return value === undefined || value === null || value === "" ? undefined : Number(value);
}

export function toCustomer(input: Record<string, unknown> | undefined) {
  return {
    email: str(input?.email)!,
    first_name: str(input?.first_name),
    last_name: str(input?.last_name),
    phone: str(input?.phone),
  };
}

// ---- transport details -------------------------------------------------------

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function buildHeaders(credential: Credential, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = { "X-API-Key": String(credential.api_key), Accept: "application/json" };
  if (hasBody) headers["Content-Type"] = "application/json";
  if (credential.center_id) headers["X-Center-Id"] = String(credential.center_id);
  return headers;
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

/** Kenko's `{ message }` is the contract; add a gloss only where the status carries extra meaning. */
function describeError(status: number, payload: any): string {
  const message = payload?.message || payload?.error || `HTTP ${status}`;
  const fields = formatFieldErrors(payload?.errors);
  const detail = fields ? `${message} (${fields})` : message;
  switch (status) {
    case 401:
      return `${detail} — the API key is missing or invalid.`;
    case 403:
      return `${detail} — the connection is revoked, the center does not match the key, or the key lacks the required scope.`;
    case 429:
      return `${detail} — rate limit exceeded for this scope; retry after a pause.`;
    default:
      return detail;
  }
}

function formatFieldErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;
  return (
    Object.entries(errors as Record<string, unknown>)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
      .join("; ") || null
  );
}
