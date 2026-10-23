import { notFound, redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import MessageBox from "./MessageBox";

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
      <h1 className="text-3xl font-bold">Your answers</h1>
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