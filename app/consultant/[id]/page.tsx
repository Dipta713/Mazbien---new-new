import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Panel from "./Panel";
import { getSessionInfo } from "@/lib/supabase/server";
import { one, shortDate } from "@/lib/format";
import type { Addon, Pkg } from "@/lib/types";

export const metadata = { title: "Review assessment | Mazbien IntelliHub" };

type Ans = { answer_text: string | null; questions: { prompt: string; display_order: number } | null; question_options: { label: string; is_other: boolean } | null };

export default async function Review({ params }: { params: { id: string } }) {
  const { supabase, user, isConsultant } = await getSessionInfo();
  if (!user) redirect(`/login?next=/consultant/${params.id}`);
  if (!isConsultant) redirect("/consultant");

  const id = params.id;
  const { data: a } = await supabase
    .from("assessments")
    .select("id,status,submitted_at,organizations(name,industry,employee_range),assessment_departments(other_label,departments(name,is_other))")
    .eq("id", id).maybeSingle();
  if (!a) notFound();

  const [{ data: answers }, { data: rec }, { data: packages }, { data: addons }, { data: choice }, { data: chosen }, { data: notes }] = await Promise.all([
    supabase.from("assessment_answers").select("answer_text,questions(prompt,display_order),question_options(label,is_other)").eq("assessment_id", id),
    supabase.from("recommendations").select("client_summary,status,recommendation_items(title,rationale,priority,sequence_order),recommendation_addons(addon_id,rationale)").eq("assessment_id", id).maybeSingle(),
    supabase.from("packages").select("*").eq("active", true).order("display_order"),
    supabase.from("addons").select("*").eq("active", true).order("category").order("name"),
    supabase.from("assessment_package_choices").select("package_id,payment_preference").eq("assessment_id", id).maybeSingle(),
    supabase.from("assessment_addons").select("addon_id").eq("assessment_id", id),
    supabase.from("consultant_notes").select("id,body,created_at").eq("assessment_id", id).order("created_at", { ascending: false }),
  ]);

  const org = one(a.organizations as unknown as { name: string; industry: string | null; employee_range: string | null } | null);
  const depts = ((a.assessment_departments ?? []) as unknown as { other_label: string | null; departments: { name: string; is_other: boolean } | { name: string; is_other: boolean }[] | null }[])
    .map((d) => { const x = one(d.departments); return x?.is_other ? `Other: ${d.other_label}` : x?.name; }).filter(Boolean);

  // Group answers under their question prompt
  const groups = new Map<string, { order: number; values: string[] }>();
  ((answers ?? []) as unknown as Ans[]).forEach((r) => {
    const q = one(r.questions as never) as Ans["questions"]; const o = one(r.question_options as never) as Ans["question_options"];
    if (!q) return;
    const g = groups.get(q.prompt) ?? { order: q.display_order, values: [] };
    g.values.push(o?.is_other ? `Other: ${r.answer_text}` : o?.label ?? r.answer_text ?? "");
    groups.set(q.prompt, g);
  });
  const sorted = [...groups.entries()].sort((x, y) => x[1].order - y[1].order);

  return (
    <section className="section py-10">
      <Link href="/consultant" className="text-sm font-bold text-brand-deep hover:underline">← All assessments</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold">{org?.name}</h1>
          <p className="text-ink/65">{org?.industry} · {org?.employee_range} people · submitted {shortDate(a.submitted_at)}</p>
        </div>
        <span className={`chip ${a.status === "approved" ? "bg-mint-soft" : "bg-brand-soft text-brand-deep"}`}>{a.status === "approved" ? "Approved" : "Waiting for review"}</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="panel p-6">
            <h2 className="text-xl font-bold">Client answers</h2>
            <p className="mt-1 text-sm text-ink/55">Departments in scope: {depts.join(", ") || "none"}</p>
            <dl className="mt-4 space-y-4">
              {sorted.map(([prompt, g]) => (
                <div key={prompt}><dt className="text-sm font-bold text-ink/55">{prompt}</dt><dd className="mt-0.5">{g.values.join(" · ")}</dd></div>
              ))}
            </dl>
          </div>
          <div className="panel p-6">
            <h2 className="text-xl font-bold">System reasoning</h2>
            <p className="mt-2 text-ink/70">{rec?.client_summary}</p>
            <ul className="mt-4 space-y-3">
              {(rec?.recommendation_items ?? []).sort((x, y) => x.sequence_order - y.sequence_order).map((i) => (
                <li key={i.title} className="rounded-xl bg-paper p-3 text-sm"><b>{i.title}</b> · {i.rationale}</li>
              ))}
            </ul>
          </div>
        </div>

        <Panel
          assessmentId={id} userId={user.id} status={a.status}
          packages={(packages ?? []) as Pkg[]} addons={(addons ?? []) as Addon[]}
          packageId={choice?.package_id ?? null} payment={choice?.payment_preference ?? null}
          addonIds={(chosen ?? []).map((c) => c.addon_id)}
          recAddons={rec?.recommendation_addons ?? []}
          notes={notes ?? []}
        />
      </div>
    </section>
  );
}
