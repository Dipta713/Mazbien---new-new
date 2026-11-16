import { createClient } from "@/lib/supabase/server";
import { failJson, logIntegration } from "@/lib/integrationLog";
import { sendEmail } from "@/lib/email";
import { getQuote } from "@/lib/quote";
import { depositEmail } from "@/lib/emailTemplates";

// Marks the deposit as received, saves the receipt link, and emails the client.
// - Real Stripe: the page sends the session_id Stripe put in the return URL; we ask Stripe if it was really paid.
// - Demo mode (no STRIPE_SECRET_KEY): the demo button calls this without a session_id.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failJson("app", "unauthorized", "Please sign in again.", 401);

  const { assessmentId, sessionId } = await req.json().catch(() => ({}));
  const { data: choice } = await supabase.from("assessment_package_choices").select("deposit_status").eq("assessment_id", assessmentId ?? "").maybeSingle();
  if (!choice) return failJson("app", "not_found", "We could not find that assessment.", 404);
  if (choice.deposit_status !== "none") return Response.json({ ok: true, status: choice.deposit_status, emailSent: null });

  const key = process.env.STRIPE_SECRET_KEY;
  let status: "paid" | "demo" = "demo";
  let receiptUrl: string | null = null;
  if (key) {
    if (!sessionId) return failJson("stripe", "no_session", "We could not confirm the payment.", 400);
    // expand = also return the payment and its charge, which holds the receipt link
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`, { headers: { Authorization: `Bearer ${key}` } });
    const s = await res.json().catch(() => ({}));
    if (!res.ok || s.payment_status !== "paid" || s.metadata?.assessment_id !== assessmentId) {
      logIntegration({ service: "stripe", action: "checkout.sessions.retrieve", ok: false, status: res.status, detail: s.error?.message ?? `payment_status=${s.payment_status}`, assessmentId });
      return failJson("stripe", "not_paid", "We could not confirm your payment yet. If you were charged, the consultant will see it in Stripe.");
    }
    status = "paid";
    receiptUrl = s.payment_intent?.latest_charge?.receipt_url ?? null;
  }

  const { error } = await supabase.from("assessment_package_choices")
    .update({ deposit_status: status, receipt_url: receiptUrl, paid_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId);
  if (error) return failJson("app", "db_error", error.message, 500);

  // Email with the full breakdown. If this fails the deposit is still saved.
  let emailSent = false;
  const quote = await getQuote(supabase, assessmentId);
  if (quote) {
    const origin = new URL(req.url).origin;
    const mail = depositEmail(quote, { demo: status === "demo", dashboardUrl: `${origin}/dashboard/${assessmentId}` });
    emailSent = await sendEmail({ to: user.email ?? "", assessmentId, subject: mail.subject, html: mail.html });
  }
  return Response.json({ ok: true, status, emailSent });
}
