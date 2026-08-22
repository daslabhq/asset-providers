# Connecting a Kenko business

Kenko has two doors, and they issue different keys.

- The **partner key** is what this provider's tools use: class schedules,
  appointment slots, contacts, and booking. The studio generates it when it
  connects a partner. See
  [The Kenko Partner Public API](/docs/kenko/partner-api), spec at
  <https://documenter.getpostman.com/view/29834338/2sBY4VJweq>.
- The **Zapier app key** below is the older, broader automation surface. It
  reaches memberships and leads, which the partner API does not — but it has
  no scheduling or booking-slot surface.

The rest of this page describes the Zapier key.

## Getting the key

Kenko issues an API key from the app catalogue inside its CRM:

1. Open the Kenko CRM and go to **Apps**.
2. Find the **Zapier** app and click **Install**.
3. Kenko returns a 16-character hexadecimal key.

The key is issued per business, and creating one needs organisation
administrator or owner rights. There is no self-serve trial that reaches this
screen — the key requires an active Kenko account.

## What the key reaches

The key covers the member and booking surface:

| Object | What you get |
| --- | --- |
| Contacts | new contacts, contact updates, lead-to-customer conversion, contact search |
| Bookings | class bookings and cancellations, appointment bookings and cancellations |
| Memberships | purchases and status changes |
| Leads | creating a lead, with email, name, phone, date of birth, source, and marketing consent |

## What it does not reach

Nothing about money. No invoices, no charges, no refunds, no gift cards, no
POS transactions. That is not a gap in the key — it reflects how Kenko is
built. Payments settle in a processor account the business owns, so billing
data is read from there. See
[Where Kenko payment data actually lives](/docs/kenko/payments-and-stripe).

## A complete picture

For a business you want to see end to end, connect two things:

- **Kenko** — members, memberships, bookings
- **Stripe** (or Amazon Payment Services, Adyen, or Razorpay, depending on the
  region) — invoices, charges, refunds, payouts

Joined on the member's email address, that pair answers the questions neither
side can answer alone: which memberships are lapsing before the renewal
charge fails, which class formats actually carry revenue, and which members
paid but stopped showing up.
