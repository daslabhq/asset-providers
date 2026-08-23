# The Kenko Partner Public API

The tools in this provider are built on Kenko's partner integration surface,
base path `/api/public/v1` on `https://data.bookeeapp.com` (Kenko serves it
from the Bookee data host — Kenko is the former Bookee).

**Published spec:**
<https://documenter.getpostman.com/view/29834338/2sBY4VJweq>

That page is the authority for request and response shapes. Anything below is
a reading of it, not a replacement.

## Getting a key

The studio generates the key when it connects a partner in Kenko, and Kenko
shows it exactly once. Along with it the studio hands over a **Connection ID**
and a **Center ID**. The key is bound to a single center.

Becoming a partner is a manual step on Kenko's side — there is a signup form
linked from the spec page.

Note this is **not** the same credential as the 16-character Zapier app key in
[Connecting a Kenko business](/docs/kenko/connecting-kenko). Two different
doors: the Zapier key reaches memberships and leads, the partner key reaches
schedules, appointment slots, and booking. This provider uses the partner key.

## Authentication

Every call carries `X-API-Key`. `X-Center-Id` is optional and must match the
center the key is bound to when sent — a mismatch is a 403, which is why this
provider only sends it when an operator explicitly pins one on the account.

Keys are scoped, and each scope carries its own rate limit:

| Scope | Limit | Used by |
| --- | --- | --- |
| `read:schedules` | 120/min | centers, schedules, appointments, bookables, list bookings |
| `read:availability` | 60/min | class availability, appointment slots |
| `read:contacts` | 60/min | contact lookup |
| `write:contacts` | 30/min | contact upsert |
| `write:bookings` | 20/min | create and cancel bookings |

Every response reports `X-RateLimit-Limit` and `X-RateLimit-Remaining`. A
missing scope is a 403 with `{"message":"Insufficient scope"}`, not a 401.

## Classes and appointments are different objects

This is the distinction the whole surface turns on, and the one most likely to
send a caller down the wrong path.

A **class** (Kenko calls it a schedule) is a public group session that already
has a time. You list it, you read its remaining spots, you book it by
`schedule_id`. Only sessions the studio marked public for partners appear.

An **appointment** is a service product — "Private Pilates", 60 minutes — with
no time of its own. Booking one takes four steps: find the product, pick an
Instructor or Facility that serves it, ask for slots, then book the slot.

```
kenko_list_appointments   → appointment_id "42"
kenko_list_bookables      → instructor b2c3…  (services: ["42"])
kenko_list_appointment_slots(42, start_date, user_id) → starts_at
kenko_create_booking(appointment_id, starts_at, bookables[])
```

Booked appointments never show up under schedules. `kenko_list_bookings` is
the only place both kinds appear together.

## Reads are center-wide, writes are partner-only

`GET /bookings` returns every reservation at the center whatever channel made
it — the Kenko CRM, the webstore, another partner. That makes it a genuine
single source of truth for what is booked.

Create and cancel are narrower: they only ever touch bookings attributed to
this partner's key. You can see a CRM booking and you cannot cancel it.

The same asymmetry applies to availability. Appointment slot counts reflect
bookings from every channel, so they are trustworthy even though you can only
have created some of them.

## external_reference_id

Every booking carries an id you choose, up to 255 characters — typically your
own order or checkout id. It is not decoration:

- **Idempotency.** If Kenko already holds an active booking for your partner
  with that reference, `POST /bookings` returns the existing booking instead
  of creating a second one. Retrying after a network error is safe.
- **Addressing.** Cancel accepts it in place of the Kenko numeric booking id.
- **Correlation.** It comes back on every booking payload and on the booking
  webhooks, so events match to your own records.

It is unique per partner — two partners can use the same string without
colliding. After a cancellation Kenko releases the reference and you may reuse
it on a new booking.

## Status codes are integers

Bookings carry `status` and `payment_status` as bare integers. This provider
decodes them into `status_label` and `payment_status_label` alongside the raw
values.

| `status` | | `payment_status` | |
| --- | --- | --- | --- |
| 1 | booked | 1 | paid |
| 2 | waitlist | 2 | unpaid |
| 3 | cancelled | 3 | failed |
| 4 | cancelled by contact | 4 | refunded |
| 5 | waitlist cancelled | | |
| 6 | blocked | | |
| 7 | failed | | |

Kenko has committed to announcing any move to string enums before shipping it.

## Timezones

Event times come back in the connected center's own timezone as ISO-8601 with
an offset. The IANA zone name is on the center record, so
`kenko_list_centers` is worth one call before interpreting or formatting any
times.

## Errors worth handling

Kenko's error bodies are `{ "message": "..." }` and the message text is the
contract — surface it rather than paraphrasing.

| Message | What to do |
| --- | --- |
| `Schedule has no available spots.` | Capacity is full; offer another session |
| `Schedule is cancelled.` | The studio cancelled the class |
| `Could not acquire booking lock.` | Transient contention — retry |
| `Appointment slot has no available spots.` | Re-read slots, the grid moved |
| `Staff bookable not found.` | The Instructor id is not valid for this center |
| `Authorization revoked or inactive` | The studio disconnected the partner |

## Webhooks

Kenko can push events outbound: `booking.confirmed`, `booking.cancelled`,
`booking.updated`, `availability.changed`, `class.schedule.changed`, and
`authorization.created`. Every payload carries `connection_id` so multi-studio
partners can route it.

Subscriptions are configured by Kenko ops, not self-serve: you give them a URL
and receive a signing secret. Each delivery carries `X-Partner-Event` and
`X-Partner-Signature`, the latter being `sha256=` plus an HMAC-SHA256 of the
raw JSON body under that secret. Verify against the raw bytes, before parsing.

**This provider does not implement webhook ingestion yet** — the tools poll.
Wiring it up would need a receiving route plus a subscription arranged with
Kenko ops.
