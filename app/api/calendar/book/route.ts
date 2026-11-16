import { createClient } from "@/lib/supabase/server";
import { createEvent, freeSlots, getBusy, GoogleError, SLOT_MINUTES } from "@/lib/googleCalendar";
import { failJson, logIntegration } from "@/lib/integrationLog";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failJson("app", "unauthorized", "Please sign in again.", 401);

  const { assessmentId, startISO, type, address } = await req.json().catch(() => ({}));
  if (!assessmentId || !startISO || !["video", "in_person"].includes(type)) return failJson("app", "bad_request", "Missing booking details.", 400);

  // RLS: this only returns a row if the signed-in user owns the assessment.
  const { data: a } = await supabase.from("assessments").select("id,organizations(name)").eq("id", assessmentId).maybeSingle();
  if (!a) return failJson("app", "not_found", "We could not find that assessment.", 404);
  const org = Array.isArray(a.organizations) ? a.organizations[0] : a.organizations;
  const startMs = Date.parse(startISO);
  if (Number.isNaN(startMs) || startMs < Date.now()) return failJson("app", "bad_time", "Pick a time in the future.", 400);
  const endMs = startMs + SLOT_MINUTES * 60000;

  try {
    // Check again right before booking, in case someone took the slot a minute ago.
    const busy = await getBusy(new Date(startMs), new Date(endMs));
    if (freeSlots(busy).every((s) => s.start !== startMs)) return failJson("google_calendar", "slot_taken", "That time was just taken. Please pick another one.", 409);

    const ev = await createEvent({
      startISO: new Date(startMs).toISOString(), endISO: new Date(endMs).toISOString(),
      clientEmail: user.email ?? "", orgName: org?.name ?? "Client", type, location: address,
    });
    const { error } = await supabase.from("consultations").upsert({
      assessment_id: assessmentId, starts_at: new Date(startMs).toISOString(), ends_at: new Date(endMs).toISOString(),
      meeting_type: type, client_address: address ?? null, meet_link: ev.meetLink, google_event_id: ev.eventId,
    }, { onConflict: "assessment_id" });
    if (error) throw new GoogleError("db_error", error.message, 500);

    logIntegration({ service: "google_calendar", action: "events.insert", ok: true, assessmentId });
    return Response.json({ ok: true, startsAt: new Date(startMs).toISOString(), meetLink: ev.meetLink });
  } catch (e) {
    const err = e instanceof GoogleError ? e : new GoogleError("unknown", (e as Error).message);
    logIntegration({ service: "google_calendar", action: "events.insert", ok: false, status: err.status, detail: `${err.code}: ${err.message}`, assessmentId });
    return failJson("google_calendar", err.code, "We could not book that time. Nothing was saved. Please try again or message the consultant.");
  }
}
