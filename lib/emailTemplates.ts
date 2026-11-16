// Plain HTML emails. Keep the wording short and direct.
import { money } from "@/lib/format";
import { DEPOSIT_AMOUNT, type Quote } from "@/lib/quote";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const row = (label: string, value: string, bold = false) =>
  `<tr><td style="padding:6px 0;${bold ? "font-weight:bold;" : ""}">${esc(label)}</td><td style="padding:6px 0;text-align:right;${bold ? "font-weight:bold;" : ""}">${esc(value)}</td></tr>`;

export function totalBreakdown(q: Quote): string {
  const rows: string[] = [];
  if (q.packageName) rows.push(row(`${q.packageName} package`, q.packageIsQuote ? "Custom quote" : money(q.packagePrice)));
  for (const a of q.addons) rows.push(row(a.name, a.isQuote ? "Custom quote" : money(a.price)));
  const totalText = q.total !== null ? money(q.total) : q.addonTotal ? `Custom quote + ${money(q.addonTotal)} add-ons` : "Custom quote";
  rows.push(row("Estimated total", totalText, true));
  rows.push(row("Deposit", `− $${DEPOSIT_AMOUNT}`));
  if (q.total !== null) rows.push(row("Balance after deposit", money(Math.max(q.total - DEPOSIT_AMOUNT, 0)), true));
  return `<table style="border-collapse:collapse;width:100%;max-width:460px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;margin:12px 0">${rows.join("")}</table>`;
}

const note = `<p style="font-size:13px;color:#666">Prices are estimates. Your consultant confirms the final price. Your $${DEPOSIT_AMOUNT} deposit counts toward the total once we start working together.</p>`;

export function depositEmail(q: Quote, o: { demo: boolean; dashboardUrl: string }) {
  return {
    subject: "Your Mazbien deposit receipt",
    html: `<p>Hi,</p>
<p>We received your <b>$${DEPOSIT_AMOUNT} deposit</b>${o.demo ? " (demo mode, no card was charged)" : ""} for a Mazbien IntelliHub consultation for ${esc(q.orgName)}.</p>
<p><b>Here is what you picked:</b></p>${totalBreakdown(q)}${note}
${q.receiptUrl ? `<p><a href="${q.receiptUrl}">View your payment receipt</a></p>` : ""}
<p>Next step: pick a day and time to meet. <a href="${o.dashboardUrl}">Open your page</a>.</p>
<p>Mazbien IntelliHub</p>`,
  };
}

export function bookingEmail(q: Quote, o: { when: string; type: "video" | "in_person"; meetLink: string | null; address?: string | null; dashboardUrl: string }) {
  const where = o.type === "video"
    ? (o.meetLink ? `<p>Video call: <a href="${o.meetLink}">${o.meetLink}</a></p>` : "<p>Video call. The Google Meet link is in your calendar invite.</p>")
    : `<p>In person${o.address ? `. You are starting from: ${esc(o.address)}` : ""}.</p>`;
  return {
    subject: `Your Mazbien meeting: ${o.when}`,
    html: `<p>Hi,</p>
<p>Your consultation is booked for <b>${esc(o.when)}</b> (Calgary time).</p>${where}
<p><b>Your plan and total:</b></p>${totalBreakdown(q)}${note}
${q.receiptUrl ? `<p><a href="${q.receiptUrl}">View your deposit receipt</a></p>` : ""}
<p>You can see this meeting any time on <a href="${o.dashboardUrl}">your page</a>. A Google Calendar invite was also sent to this email.</p>
<p>Mazbien IntelliHub</p>`,
  };
}
