import { request, unwrap, decodeBooking } from "../lib/client";

// role:"browse" — feeds the asset picker. Input: { type, search, parentId }.
//   contact  → lookupContacts(search); empty search shows nothing (Kenko has no
//              "list all contacts" on the partner surface)
//   schedule → public classes in the next 14 days, name-filtered by search
//   booking  → bookings; with parentId (a contact id) only that contact's
// Metadata keys mirror the fields declared on the asset types.
export default async function (input: any, ctx: any) {
  const type = String(input.type || "");
  const search = String(input.search || "").trim();
  const parentId = String(input.parentId || "").trim();

  if (type === "contact") {
    if (!search) return { items: [] };
    const { data } = unwrap(await request(ctx.credential, "/contacts", { query: { query: search, limit: 40 } }));
    return {
      items: (Array.isArray(data) ? data : []).map((c: any) => ({
        id: String(c.id),
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || String(c.id),
        description: c.email || c.phone || "",
        metadata: {
          name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          email: c.email || "",
          phone: c.phone || "",
        },
      })),
    };
  }

  if (type === "schedule") {
    const { data } = unwrap(
      await request(ctx.credential, "/schedules", {
        query: { start_date: isoDate(0), end_date: isoDate(14), per_page: 100 },
      }),
    );
    const all = Array.isArray(data) ? data : [];
    const q = search.toLowerCase();
    const matches = q ? all.filter((s: any) => String(s.name || s.title || "").toLowerCase().includes(q)) : all;
    return {
      items: matches.slice(0, 60).map((s: any) => ({
        id: String(s.id),
        name: s.name || s.title || String(s.id),
        description: `${s.start_time || s.starts_at || ""}${s.available_spots != null ? ` · ${s.available_spots} open` : ""}`,
        metadata: {
          name: s.name || s.title || "",
          startsAt: s.start_time || s.starts_at || "",
          capacity: String(s.capacity ?? ""),
          availableSpots: String(s.available_spots ?? ""),
        },
      })),
    };
  }

  if (type === "booking") {
    const { data } = unwrap(
      await request(ctx.credential, "/bookings", { query: { start_date: isoDate(-30), end_date: isoDate(60), per_page: 100 } }),
    );
    const all = (Array.isArray(data) ? data : []).map(decodeBooking);
    const scoped = parentId ? all.filter((b: any) => String(b.contact_id ?? b.customer_id ?? b.contact?.id ?? "") === parentId) : all;
    return {
      items: scoped.slice(0, 60).map((b: any) => ({
        id: String(b.id),
        name: b.title || b.event_name || b.schedule?.name || `Booking ${b.id}`,
        description: `${b.event_type || ""} · ${b.status_label}`,
        ...(parentId ? { parentId } : {}),
        metadata: {
          kind: b.event_type || "",
          title: b.title || b.event_name || "",
          startsAt: b.start_time || b.starts_at || "",
          status: b.status_label,
        },
      })),
    };
  }

  return { items: [] };
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
