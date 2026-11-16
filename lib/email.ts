// Sends email with Resend (free, no card). If RESEND_API_KEY is empty, email is skipped and nothing breaks.
// Note: Resend's test sender (onboarding@resend.dev) only delivers to the email you signed up to Resend with,
// unless you verify your own domain and set EMAIL_FROM.
import { logIntegration } from "@/lib/integrationLog";

export async function sendEmail(args: { to: string; subject: string; html: string; assessmentId?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !args.to) {
    logIntegration({ service: "email", action: "send", ok: true, detail: "skipped (no RESEND_API_KEY or no recipient)", assessmentId: args.assessmentId });
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Mazbien IntelliHub <onboarding@resend.dev>", to: [args.to], subject: args.subject, html: args.html }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      logIntegration({ service: "email", action: "send", ok: false, status: res.status, detail: j.message ?? "send failed", assessmentId: args.assessmentId });
      return false;
    }
    logIntegration({ service: "email", action: "send", ok: true, assessmentId: args.assessmentId });
    return true;
  } catch (e) {
    logIntegration({ service: "email", action: "send", ok: false, detail: (e as Error).message, assessmentId: args.assessmentId });
    return false;
  }
}
