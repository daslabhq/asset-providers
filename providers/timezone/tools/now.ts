// Current time for an IANA timezone — body-style tool: reads ctx.input, returns a value.
// No network: uses Intl.DateTimeFormat. ctx.input.timezone is the IANA id.
const tz = (ctx.input && ctx.input.timezone) || "UTC";
const now = new Date();
const fmt = (opts) => new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(now);

const offsetPart = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
  .formatToParts(now)
  .find((p) => p.type === "timeZoneName");

return {
  timezone: tz,
  city: tz.split("/").pop().replace(/_/g, " "),
  time: fmt({ hour: "2-digit", minute: "2-digit", hour12: false }),
  date: fmt({ weekday: "long", month: "long", day: "numeric" }),
  offset: offsetPart ? offsetPart.value : "",
  iso: now.toISOString(),
};
