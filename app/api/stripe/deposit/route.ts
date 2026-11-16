import { createClient } from "@/lib/supabase/server";
import { failJson, logIntegration } from "@/lib/integrationLog";

const DEPOSIT_CENTS = 10000; // $100 CAD placeholder

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failJson("app", "unauthorized", "Please sign in again.", 401);

  const { assessmentId } = await req.json().catch(() => ({}));
  const { data: a } = await supabase.from("assessments").select("id").eq("id", assessmentId ?? "").maybeSingle();
  if (!a) return failJson("app", "not_found", "We could not find that assessment.", 404);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // No Stripe key yet: tell the page to show the demo deposit card.
    logIntegration({ service: "stripe", action: "checkout.sessions.create", ok: true, detail: "demo mode (no key)", assessmentId });
    return Response.json({ ok: true, mode: "demo", amount: DEPOSIT_CENTS / 100 });
  }

  try {
    const origin = new URL(req.url).origin;
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "cad",
      "line_items[0][price_data][unit_amount]": String(DEPOSIT_CENTS),
      "line_items[0][price_data][product_data][name]": "Mazbien consultation deposit",
      success_url: `${origin}/assessment/${assessmentId}?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/assessment/${assessmentId}?deposit=cancelled`,
      "metadata[assessment_id]": assessmentId,
    });
    if (user.email) body.set("customer_email", user.email);
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      logIntegration({ service: "stripe", action: "checkout.sessions.create", ok: false, status: res.status, detail: `${json.error?.type}: ${json.error?.message}`, assessmentId });
      return failJson("stripe", json.error?.code ?? json.error?.type ?? "stripe_error", "The card page is not available right now. Nothing was charged and your request is still saved. The consultant can send an invoice instead.");
    }
    logIntegration({ service: "stripe", action: "checkout.sessions.create", ok: true, assessmentId });
    return Response.json({ ok: true, mode: "live", url: json.url });
  } catch (e) {
    logIntegration({ service: "stripe", action: "checkout.sessions.create", ok: false, detail: (e as Error).message, assessmentId });
    return failJson("stripe", "unknown", "The card page is not available right now. Nothing was charged and your request is still saved.");
  }
}
