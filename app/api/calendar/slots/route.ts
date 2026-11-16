import { createClient } from "@/lib/supabase/server";
import { candidateSlots, freeSlots, getBusy, GoogleError } from "@/lib/googleCalendar";
import { failJson, logIntegration } from "@/lib/integrationLog";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failJson("app", "unauthorized", "Please sign in again.", 401);

  // Times stay locked until the $100 deposit is paid.
  const assessmentId = new URL(req.url).searchParams.get("assessmentId") ?? "";
  const { data: choice } = await supabase.from("assessment_package_choices").select("deposit_status").eq("assessment_id", assessmentId).maybeSingle();
  if (!choice || choice.deposit_status === "none") return failJson("app", "deposit_required", "Pay the $100 deposit to unlock meeting times.", 402);

  try {
    const all = candidateSlots();
    const busy = await getBusy(new Date(all[0].start), new Date(all[all.length - 1].end));
    const slots = freeSlots(busy).map((s) => new Date(s.start).toISOString());
    logIntegration({ service: "google_calendar", action: "freeBusy", ok: true, detail: `${slots.length} open slots` });
    return Response.json({ ok: true, slots });
  } catch (e) {
    const err = e instanceof GoogleError ? e : new GoogleError("unknown", (e as Error).message);
    logIntegration({ service: "google_calendar", action: "freeBusy", ok: false, status: err.status, detail: `${err.code}: ${err.message}` });
    return failJson("google_calendar", err.code, "We could not load the consultant's calendar right now. Your request is saved, so you can message the consultant to pick a time instead.");
  }
}
