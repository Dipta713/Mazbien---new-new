// Google Calendar helpers. Uses plain fetch, no extra packages.
// The calendar we read and write is the CONSULTANT's. The client gets a Google invite by email.
const TZ = "America/Edmonton"; // Calgary time
export const SLOT_MINUTES = 30;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 17;

export class GoogleError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}

export function calendarConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

async function accessToken(): Promise<string> {
  if (!calendarConfigured()) throw new GoogleError("not_configured", "Google Calendar keys are missing in .env.local", 503);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(json.error ?? "token_error", json.error_description ?? "Could not get a Google access token", res.status);
  return json.access_token as string;
}

const calId = () => process.env.CONSULTANT_CALENDAR_ID || "primary";

export async function getBusy(timeMin: Date, timeMax: Date): Promise<{ start: number; end: number }[]> {
  const token = await accessToken();
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), timeZone: TZ, items: [{ id: calId() }] }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(json.error?.status ?? "freebusy_error", json.error?.message ?? "freeBusy failed", res.status);
  const busy = json.calendars?.[calId()]?.busy ?? [];
  return busy.map((b: { start: string; end: string }) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export async function createEvent(args: { startISO: string; endISO: string; clientEmail: string; orgName: string; type: "video" | "in_person"; location?: string }) {
  const token = await accessToken();
  const body: Record<string, unknown> = {
    summary: `Mazbien consultation: ${args.orgName}`,
    description: "Training needs consultation booked from the Mazbien IntelliHub assessment.",
    start: { dateTime: args.startISO, timeZone: TZ },
    end: { dateTime: args.endISO, timeZone: TZ },
    attendees: [{ email: args.clientEmail }],
  };
  if (args.type === "video") {
    body.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } };
  } else {
    body.location = args.location || process.env.OFFICE_ADDRESS || "Calgary, AB";
  }
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId())}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(json.error?.status ?? "event_error", json.error?.message ?? "Could not create the event", res.status);
  return { eventId: json.id as string, meetLink: (json.hangoutLink as string | undefined) ?? null };
}

// ---- time zone helpers (so 9am means 9am in Calgary, also across daylight saving) ----
function tzOffsetMs(utcMs: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value])
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
function calgaryToUtc(y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess));
}
function calgaryToday() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}

/** Every 30-minute start time on weekdays in the next 14 days, 9am to 5pm Calgary time. */
export function candidateSlots(): { start: number; end: number }[] {
  const t = calgaryToday();
  const out: { start: number; end: number }[] = [];
  let days = 0;
  for (let i = 1; i <= 14; i++) {
    const day = new Date(Date.UTC(t.y, t.m - 1, t.d + i));
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    days++;
    for (let mins = DAY_START_HOUR * 60; mins + SLOT_MINUTES <= DAY_END_HOUR * 60; mins += SLOT_MINUTES) {
      const start = calgaryToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), Math.floor(mins / 60), mins % 60);
      out.push({ start, end: start + SLOT_MINUTES * 60000 });
    }
  }
  return out;
}

export function freeSlots(busy: { start: number; end: number }[]) {
  return candidateSlots().filter((s) => !busy.some((b) => s.start < b.end && s.end > b.start));
}
