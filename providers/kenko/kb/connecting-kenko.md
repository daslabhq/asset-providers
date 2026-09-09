# Connecting a Kenko business

Kenko lists Daslab as an app inside its CRM, and the key you connect with
comes out of that app. Nothing is generated on the Daslab side.

## Getting the key

1. Sign in to the Kenko CRM at <https://crm.gokenko.com> as staff of the
   location you want to connect, with organisation administrator or owner
   rights. The app is only visible to staff of that location.
2. Open **Apps**, find **Daslab**, and click **Connect**.
3. Kenko shows an **Authorization Key** once. Copy it.
4. Paste it into the API Key field of the Kenko account in Daslab.

The key is bound to that one center. `kenko_list_centers` confirms which,
along with the center's connection id and timezone.

Kenko enables the Daslab app per brand. If it is not in your Apps list, ask
your Kenko account manager to add it. Kenko does not enable it on trial
accounts, so a trial tenant cannot be connected.

## What the key reaches

Class schedules and remaining spots, appointment products with their
instructors, facilities and open slots, contacts, and bookings. Reads cover
every booking at the center whatever channel made it; creating and cancelling
is limited to bookings made through Daslab. The full surface is in
[The Kenko Partner Public API](/docs/kenko/partner-api).

## What it does not reach

Nothing about money. No invoices, no charges, no refunds, no gift cards, no
POS transactions. That is not a gap in the key — it reflects how Kenko is
built. Payments settle in a processor account the business owns, so billing
data is read from there. See
[Where Kenko payment data actually lives](/docs/kenko/payments-and-stripe).

Memberships and leads are not on this surface either. Kenko's older Zapier
app, installed from the same Apps section, issues a separate 16-character key
that reaches those two objects but has no schedule or booking surface. This
provider does not use it.

## A complete picture

For a business you want to see end to end, connect two things:

- **Kenko** — classes, appointments, members, bookings
- **Stripe** (or Amazon Payment Services, Adyen, or Razorpay, depending on the
  region) — invoices, charges, refunds, payouts

Joined on the member's email address, that pair answers the questions neither
side can answer alone: which class formats actually carry revenue, which
members paid but stopped showing up, and which bookings never turned into a
charge.
