# Where Kenko payment data actually lives

Kenko shows you invoices, auto-renewals, instalment plans, gift cards, and a
point-of-sale screen. None of that data originates in Kenko. Kenko is a
front end on a payment processor account that the business owns.

From Kenko's own setup guide:

> Before you begin setting up anything on Kenko, it is crucial to link your
> Stripe account. […] All payments made through Kenko are handled via Stripe,
> and any saved cards are securely stored on your linked Stripe account.

That is Stripe Connect in its account-linking form: the business creates or
signs into its own Stripe account, authorises Kenko, and keeps the account.
The customer records, the saved cards, the charge history, the payouts — all
of it sits in a Stripe dashboard the business can log into directly.

## What this means in practice

Connect **Stripe** for anything involving money:

- invoices and their line items
- charges, refunds, and disputes
- subscriptions behind recurring memberships
- payouts and balance transactions
- card-present POS transactions taken on a Stripe Terminal reader

Connect **Kenko** for the things only Kenko knows:

- who the members are, and which are still leads
- what plan or credit pack each one holds, and when it renews
- which classes and appointments were booked, attended, or cancelled

The two join on the customer's email address, which Kenko writes onto the
Stripe customer when it creates one.

## Per location

Kenko links Stripe per location. A business running several locations can
point them all at one Stripe account, or give each its own — Kenko supports
both, and the choice is made at link time, per location. Before assuming a
single Stripe connection covers a whole brand, check how many accounts were
linked.

## Not every tenant is on Stripe

Stripe is the default and the one Kenko's own guide describes, but the CRM
also ships Amazon Payment Services, Adyen, and Razorpay for regional tenants.
Kenko's Amazon Payment Services guide follows the same shape: the business
creates its own merchant account and hands Kenko the credentials.

The pattern is what matters, and it holds across all four — **Kenko is
bring-your-own-processor.** The payment history is never locked inside Kenko,
because Kenko never owned it. Find out which processor a business settles
through, connect that, and the billing picture is complete.
