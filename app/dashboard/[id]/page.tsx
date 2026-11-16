import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import Link from "next/link";
import MessageBox from "./MessageBox";
import { getQuote, DEPOSIT_AMOUNT } from "@/lib/quote";
import { money } from "@/lib/format";

export default async function AssessmentView({ params }: { params: { id: string } }) {
    const { id } = params;
  const { supabase, user } = await getSessionInfo();
  if (!user) redirect(`/login?next=/dashboard/${id}`);

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("id", id)
    .single();
  if (!assessment) notFound();

  const { data: depts } = await supabase
    .from("assessment_departments")
    .select("other_label, departments(name, is_other)")
    .eq("assessment_id", id);

  const { data: rows } = await supabase
    .from("assessment_answers")
    .select("answer_text, questions(prompt, display_order), question_options(label)")
    .eq("assessment_id", id);

  const { data: messages } = await supabase
    .from("assessment_messages")
    .select("id, sender_role, body, created_at")
    .eq("assessment_id", id)
    .order("created_at", { ascending: true });

  // Booking card: meeting, deposit/receipt and total
  const quote = assessment.status === "draft" ? null : await getQuote(supabase, id);
  const { data: meeting } = await supabase
    .from("consultations")
    .select("starts_at, meeting_type, meet_link, client_address")
    .eq("assessment_id", id)
    .maybeSingle();
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-CA", { timeZone: "America/Edmonton", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const upcoming = meeting ? new Date(meeting.starts_at).getTime() > Date.now() : false;
  const depositDone = !!quote && quote.depositStatus !== "none";

  // Group answers by question (multi-select questions have several rows)
  const grouped = new Map<string, { order: number; answers: string[] }>();
  for (const r of (rows ?? []) as any[]) {
    const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
    const o = Array.isArray(r.question_options) ? r.question_options[0] : r.question_options;
    if (!q) continue;
    const text = [o?.label, r.answer_text].filter(Boolean).join(": ");
    if (!text) continue;
    const entry: { order: number; answers: string[] } = grouped.get(q.prompt) ?? { order: q.display_order, answers: [] };
    entry.answers.push(text);
    grouped.set(q.prompt, entry);
  }
  const items = [...grouped.entries()].sort((a, b) => a[1].order - b[1].order);

  const deptNames = ((depts ?? []) as any[])
    .map((d) => {
      const dep = Array.isArray(d.departments) ? d.departments[0] : d.departments;
      return dep?.is_other && d.other_label ? `Other: ${d.other_label}` : dep?.name;
    })
    .filter(Boolean);

  return (
    <main className="section py-10">
      {quote && (
        <section className="mb-10 rounded-2xl bg-white p-6 ring-1 ring-ink/5">
          <h1 className="text-3xl font-bold">Your consultation</h1>

          <div className="mt-4 rounded-xl bg-sun-soft p-4">
            {meeting ? (
              <>
                <p className="text-sm font-semibold text-ink/60">{upcoming ? "Upcoming meeting" : "Your meeting"}</p>
                <p className="mt-1 text-lg font-bold">{when(meeting.starts_at)} (Calgary time)</p>
                {meeting.meeting_type === "video" ? (
                  meeting.meet_link ? (
                    <a className="btn btn-primary mt-3 inline-flex" href={meeting.meet_link} target="_blank" rel="noreferrer">Join the video call</a>
                  ) : <p className="mt-1 text-sm text-ink/65">Video call. The link is in your calendar invite.</p>
                ) : (
                  <p className="mt-1 text-sm text-ink/65">In person{meeting.client_address ? `. You are starting from: ${meeting.client_address}` : ""}</p>
                )}
              </>
            ) : (
              <>
                <p className="font-bold">No meeting booked yet</p>
                <p className="mt-1 text-sm text-ink/65">{depositDone ? "Your deposit is in. Pick a day and time to meet." : `Pay the $${DEPOSIT_AMOUNT} deposit to unlock meeting times.`}</p>
                <Link className="btn btn-primary mt-3 inline-flex" href={`/assessment/${id}`}>{depositDone ? "Pick a time" : "Pay deposit and pick a time"}</Link>
              </>
            )}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-ink/60">Your plan and total</h2>
          <dl className="mt-2 divide-y divide-ink/10">
            {quote.packageName && (
              <div className="flex justify-between py-2"><dt>{quote.packageName} package</dt><dd className="font-semibold">{quote.packageIsQuote ? "Custom quote" : money(quote.packagePrice)}</dd></div>
            )}
            {quote.addons.map((a) => (
              <div key={a.name} className="flex justify-between py-2"><dt>{a.name}</dt><dd className="font-semibold">{a.isQuote ? "Custom quote" : money(a.price)}</dd></div>
            ))}
            <div className="flex justify-between py-2 font-bold">
              <dt>Estimated total</dt>
              <dd>{quote.total !== null ? money(quote.total) : quote.addonTotal ? `Custom quote + ${money(quote.addonTotal)} add-ons` : "Custom quote"}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt>Deposit {depositDone ? "paid" : "(not paid yet)"}</dt>
              <dd className="font-semibold">{depositDone ? `− $${DEPOSIT_AMOUNT}` : `$${DEPOSIT_AMOUNT}`}</dd>
            </div>
            {depositDone && quote.total !== null && (
              <div className="flex justify-between py-2 font-bold"><dt>Balance after deposit</dt><dd>{money(Math.max(quote.total - DEPOSIT_AMOUNT, 0))}</dd></div>
            )}
          </dl>
          <p className="mt-2 text-sm text-ink/55">Your ${DEPOSIT_AMOUNT} deposit counts toward the total once we start working together. A consultant confirms the final price.</p>

          {depositDone && (
            <p className="mt-4">
              {quote.receiptUrl ? (
                <a className="font-bold text-brand underline" href={quote.receiptUrl} target="_blank" rel="noreferrer">View your deposit receipt</a>
              ) : (
                <span className="text-sm text-ink/60">{quote.depositStatus === "demo" ? "Demo deposit, so there is no card receipt." : "Your receipt link is not available. Message the consultant if you need one."}</span>
              )}
            </p>
          )}
        </section>
      )}

      <h2 className="text-3xl font-bold">Your answers</h2>
      <p className="mt-1 text-ink/60">
        This is what you submitted. If something needs to change, send us a message below.
      </p>

      <dl className="mt-6 divide-y divide-ink/10 rounded-2xl bg-white p-2 ring-1 ring-ink/5">
        {deptNames.length > 0 && (
          <div className="px-4 py-3">
            <dt className="text-sm font-semibold text-ink/60">Departments</dt>
            <dd className="mt-1">{deptNames.join(", ")}</dd>
          </div>
        )}
        {items.map(([prompt, { answers }]) => (
          <div key={prompt} className="px-4 py-3">
            <dt className="text-sm font-semibold text-ink/60">{prompt}</dt>
            <dd className="mt-1">{answers.join(", ")}</dd>
          </div>
        ))}
        {items.length === 0 && deptNames.length === 0 && (
          <p className="px-4 py-3 text-ink/60">No answers saved yet.</p>
        )}
      </dl>

      <MessageBox assessmentId={id} initial={messages ?? []} />
    </main>
  );
}