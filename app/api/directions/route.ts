import { createClient } from "@/lib/supabase/server";
import { failJson, logIntegration } from "@/lib/integrationLog";

// Uses Geoapify (free key, no card). The office address stays on the server and is never sent to the browser.
const BASE = "https://api.geoapify.com/v1";

async function geocode(text: string, key: string): Promise<[number, number]> {
  const res = await fetch(`${BASE}/geocode/search?text=${encodeURIComponent(text)}&filter=countrycode:ca&limit=1&format=json&apiKey=${key}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message ?? "geocode failed"), { status: res.status, code: json.error ?? "geocode_error" });
  const r = json.results?.[0];
  if (!r) throw Object.assign(new Error(`no match for "${text}"`), { status: 404, code: "no_address" });
  return [r.lat, r.lon];
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failJson("app", "unauthorized", "Please sign in again.", 401);

  const { origin } = await req.json().catch(() => ({}));
  if (!origin || typeof origin !== "string" || origin.length > 200) return failJson("app", "bad_request", "Type your address first.", 400);
  const destination = process.env.OFFICE_ADDRESS || "Calgary, AB";

  try {
    const key = process.env.GEOAPIFY_API_KEY;
    if (!key) throw Object.assign(new Error("GEOAPIFY_API_KEY is missing in .env.local"), { status: 503, code: "not_configured" });
    const [from, to] = await Promise.all([geocode(origin, key), geocode(destination, key)]);
    const res = await fetch(`${BASE}/routing?waypoints=${from[0]},${from[1]}|${to[0]},${to[1]}&mode=approximated_transit&apiKey=${key}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.message ?? "routing failed"), { status: res.status, code: json.error ?? "routing_error" });
    const p = json.features?.[0]?.properties;
    if (!p) throw Object.assign(new Error("no transit route found"), { status: 404, code: "no_route" });
    logIntegration({ service: "google_maps", action: "geoapify.routing", ok: true });
    return Response.json({ ok: true, minutes: Math.round(p.time / 60), km: Math.round(p.distance / 100) / 10 });
  } catch (e) {
    const err = e as { message: string; status?: number; code?: string };
    logIntegration({ service: "google_maps", action: "geoapify.routing", ok: false, status: err.status, detail: `${err.code ?? "unknown"}: ${err.message}` });
    const msg = err.code === "no_address" || err.code === "no_route"
      ? "We could not find a bus or train route from that address. Try a fuller address, or open it in Google Maps below."
      : "We could not work out the trip right now. You can still open the route in Google Maps below.";
    return failJson("maps", err.code ?? "unknown", msg, err.status && err.status < 500 ? err.status : 502);
  }
}
