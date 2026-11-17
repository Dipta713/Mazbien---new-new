// One place that writes integration logs. In Vercel: Project -> Logs. Locally: your terminal.
// Search the logs for "[integration]" to find these lines.
export function logIntegration(entry: {
  service: "stripe" | "google_calendar" | "google_maps" | "email" | "anthropic";
  action: string;
  ok: boolean;
  status?: number;
  detail?: string;
  assessmentId?: string;
}) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  if (entry.ok) console.log("[integration]", line);
  else console.error("[integration] FAILED", line);
}

/** The shape every API route returns when something fails. The UI reads userMessage. */
export function failJson(service: string, code: string, userMessage: string, status = 502) {
  return Response.json({ ok: false, error: { service, code, userMessage } }, { status });
}
