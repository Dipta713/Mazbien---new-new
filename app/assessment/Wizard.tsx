"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recommend } from "@/lib/recommend";
import { suggestPackage, type FitRule } from "@/lib/packageFit";
import OptionTile from "@/components/OptionTile";
import type { AnswerMap, Department, Pick, Question } from "@/lib/types";

const DRAFT_KEY = "mazbien-assessment-draft-v1";
// >>> EDIT HERE: ASSESSMENT - STEP TITLES (the 5 step headings + subtitles) <<<
// NOTE: the QUESTIONS and answer options themselves are NOT in this file.
// They live in supabase/seed/01_reference_data.sql (re-run it in Supabase after changing).
const STEPS = [
  { id: "about", title: "About your business", sub: "Quick basics so we can tailor the plan." },
  { id: "departments", title: "Who is the training for?", sub: "Pick every department you want to include." },
  { id: "ai_use", title: "AI and tools today", sub: "Where you are right now. No wrong answers." },
  { id: "work", title: "The work itself", sub: "Tasks matter more than job titles." },
  { id: "followup", title: "A few follow-ups", sub: "Only questions that match your earlier answers." },
];
const EMPTY: Pick = { selected: [], other: "" };

export default function Wizard({ questions, departments }: { questions: Question[]; departments: Department[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [deps, setDeps] = useState<Pick>(EMPTY);
  const [stepId, setStepId] = useState("about");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Restore a saved draft (so "Save and continue later" really works in this browser)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setName(d.name ?? ""); setAnswers(d.answers ?? {}); setDeps(d.deps ?? EMPTY); setStepId(d.stepId ?? "about");
        setRestored(true);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, answers, deps, stepId })); } catch { /* ignore */ }
  }, [name, answers, deps, stepId, loaded]);

  // Keys like "departments:finance" and "ai_concerns:privacy" drive the follow-up rules
  const keys = useMemo(() => {
    const s = new Set<string>();
    const depSlug = new Map(departments.map((d) => [d.id, d.slug]));
    deps.selected.forEach((id) => depSlug.get(id) && s.add(`departments:${depSlug.get(id)}`));
    questions.forEach((q) => answers[q.question_key]?.selected.forEach((k) => s.add(`${q.question_key}:${k}`)));
    return s;
  }, [answers, deps, questions, departments]);

  const matches = (q: Question) => !q.condition_json?.any_of || q.condition_json.any_of.some((k) => keys.has(k));
  const followups = useMemo(() => questions.filter((q) => q.section === "followup" && matches(q)).slice(0, 4), [questions, keys]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = STEPS.filter((s) => s.id !== "followup" || followups.length > 0);
  const idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[idx];
  const stepQs = step.id === "followup" ? followups : questions.filter((q) => q.section === step.id);
  const isLast = idx === steps.length - 1;

  function toggle(q: Question, key: string) {
    setAnswers((prev) => {
      const cur = prev[q.question_key] ?? EMPTY;
      let sel = cur.selected;
      if (q.input_type === "single") sel = [key];
      else if (sel.includes(key)) sel = sel.filter((k) => k !== key);
      else if (!q.max_selections || sel.length < q.max_selections) sel = [...sel, key];
      return { ...prev, [q.question_key]: { ...cur, selected: sel } };
    });
  }
  const setOther = (q: Question, text: string) =>
    setAnswers((p) => ({ ...p, [q.question_key]: { ...(p[q.question_key] ?? EMPTY), other: text } }));

  function validate(): string {
    if (step.id === "about" && !name.trim()) return "Please add your business name.";
    if (step.id === "departments") {
      if (!deps.selected.length) return "Pick at least one department.";
      const other = departments.find((d) => d.is_other);
      if (other && deps.selected.includes(other.id) && !deps.other.trim()) return "Tell us which other department you mean.";
    }
    for (const q of stepQs) {
      const a = answers[q.question_key] ?? EMPTY;
      if (q.required && !a.selected.length) return `Please answer: ${q.prompt}`;
      const otherKey = q.question_options.find((o) => o.is_other)?.option_key;
      if (otherKey && a.selected.includes(otherKey) && !a.other.trim()) return "You picked “Something else”. Add a few words so we know what you mean.";
    }
    return "";
  }

  function next() {
    const msg = validate();
    if (msg) return setError(msg);
    setError("");
    if (isLast) return void submit();
    setStepId(steps[idx + 1].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setError("");
    if (idx > 0) { setStepId(steps[idx - 1].id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  async function submit() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You are signed out. Please sign in again.");

      const shown = questions.filter((q) => q.section !== "followup" || matches(q));
      const pickLabel = (qk: string) => {
        const q = questions.find((x) => x.question_key === qk)!;
        const a = answers[qk];
        if (!a?.selected.length) return "";
        const o = q.question_options.find((x) => x.option_key === a.selected[0]);
        return o?.is_other ? a.other.trim() : o?.label ?? "";
      };

      const { data: org, error: e1 } = await supabase.from("organizations")
        .insert({ owner_user_id: user.id, name: name.trim(), industry: pickLabel("industry"), employee_range: pickLabel("employee_range") })
        .select("id").single();
      if (e1) throw e1;

      const { data: asm, error: e2 } = await supabase.from("assessments")
        .insert({
          organization_id: org.id, status: "draft",
          current_ai_use: answers.current_ai_use?.selected[0] ?? null,
          confidence_level: answers.confidence?.selected[0] ?? null,
          desired_start: answers.desired_start?.selected[0] ?? null,
        }).select("id").single();
      if (e2) throw e2;

      const deptRows = deps.selected.map((id) => ({
        assessment_id: asm.id, department_id: id,
        other_label: departments.find((d) => d.id === id)?.is_other ? deps.other.trim() : null,
      }));
      const { error: e3 } = await supabase.from("assessment_departments").insert(deptRows);
      if (e3) throw e3;

      const answerRows = shown.flatMap((q) => {
        const a = answers[q.question_key];
        if (!a) return [];
        return a.selected.map((k) => {
          const opt = q.question_options.find((o) => o.option_key === k)!;
          return { assessment_id: asm.id, question_id: q.id, option_id: opt.id, answer_text: opt.is_other ? a.other.trim() : null };
        });
      });
      const { error: e4 } = await supabase.from("assessment_answers").insert(answerRows);
      if (e4) throw e4;

      // Rule-based draft recommendation (rules come from the database)
      const [{ data: addons }, { data: ruleRows }, { data: fitRows }, { data: pkgs }] = await Promise.all([
        supabase.from("addons").select("id,slug,name").eq("active", true),
        supabase.from("recommendation_rules").select("addon_slug,match_any,rationale").eq("active", true).not("addon_slug", "is", null),
        supabase.from("package_fit_rules").select("*").eq("active", true),
        supabase.from("packages").select("id,slug,name,display_order").eq("active", true),
      ]);
      const labels = new Map<string, string>();
      shown.forEach((q) => q.question_options.forEach((o) => labels.set(`${q.question_key}:${o.option_key}`, o.label)));
      departments.forEach((d) => labels.set(`departments:${d.slug}`, d.name));
      const deptNames = deps.selected.map((id) => departments.find((d) => d.id === id)!).filter((d) => !d.is_other).map((d) => d.name);
      if (deps.other.trim() && departments.find((d) => d.is_other && deps.selected.includes(d.id))) deptNames.push(deps.other.trim());

      const dbRules = (ruleRows ?? []).map((r) => ({ addon: r.addon_slug as string, triggers: r.match_any as string[], why: r.rationale as string }));
      const rec = recommend({
        orgName: name.trim(), industry: pickLabel("industry"), deptNames, keys,
        labels, taskKeys: answers.repetitive_tasks?.selected ?? [], addons: addons ?? [],
        rules: dbRules.length ? dbRules : undefined,
      });
      const fit = suggestPackage((fitRows ?? []) as FitRule[], keys, deps.selected.length, pkgs ?? []);

      const { data: r, error: e5 } = await supabase.from("recommendations")
        .insert({ assessment_id: asm.id, client_summary: rec.client_summary, status: "draft", suggested_package_id: fit?.pkg.id ?? null })
        .select("id").single();
      if (e5) throw e5;

      const itemRows: Record<string, unknown>[] = rec.items.map((i) => ({ ...i, recommendation_id: r.id }));
      if (fit) {
        itemRows.push({
          recommendation_id: r.id, title: `Suggested package: ${fit.pkg.name}`, rationale: fit.reasons.join(" "),
          priority: "high", sequence_order: 0, module_name: "package_fit",
        });
      }
      if (itemRows.length) {
        const { error } = await supabase.from("recommendation_items").insert(itemRows);
        if (error) throw error;
      }
      if (rec.addonRecs.length) {
        const { error } = await supabase.from("recommendation_addons").insert(rec.addonRecs.map((a) => ({ ...a, recommendation_id: r.id })));
        if (error) throw error;
      }
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/assessment/${asm.id}`);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Something went wrong saving your answers.");
    }
  }

  const progress = ((idx + 1) / steps.length) * 100;

  return (
    <div className="section max-w-3xl py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm font-bold text-ink/60">
          <span>Step {idx + 1} of {steps.length}</span>
          <button type="button" onClick={() => router.push("/dashboard")} className="underline hover:text-brand">Save and continue later</button>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-pink transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {restored && idx === 0 && <p className="mb-4 rounded-xl bg-sun-soft p-3 text-sm font-semibold">Welcome back. We kept your earlier answers.</p>}

      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{step.title}</h1>
      <p className="mt-2 text-ink/65">{step.sub}</p>

      <div className="mt-8 space-y-10">
        {step.id === "about" && (
          <label className="block">
            <span className="text-lg font-bold">What is your business called?</span>
            <input className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" autoComplete="organization" />
          </label>
        )}

        {step.id === "departments" && (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {departments.map((d) => (
                <OptionTile key={d.id} multi label={d.name} selected={deps.selected.includes(d.id)}
                  onClick={() => setDeps((p) => ({ ...p, selected: p.selected.includes(d.id) ? p.selected.filter((x) => x !== d.id) : [...p.selected, d.id] }))} />
              ))}
            </div>
            {departments.some((d) => d.is_other && deps.selected.includes(d.id)) && (
              <input className="input mt-3" placeholder="Which other department?" value={deps.other} onChange={(e) => setDeps((p) => ({ ...p, other: e.target.value }))} />
            )}
          </div>
        )}

        {stepQs.map((q) => {
          const a = answers[q.question_key] ?? EMPTY;
          const otherKey = q.question_options.find((o) => o.is_other)?.option_key;
          return (
            <fieldset key={q.id}>
              <legend className="text-lg font-bold">{q.prompt}</legend>
              {q.help_text && <p className="mt-1 text-sm text-ink/55">{q.help_text}</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {q.question_options.map((o) => (
                  <OptionTile key={o.id} multi={q.input_type === "multi"} label={o.label}
                    selected={a.selected.includes(o.option_key)} onClick={() => toggle(q, o.option_key)} />
                ))}
              </div>
              {otherKey && a.selected.includes(otherKey) && (
                <input className="input mt-3" placeholder="Tell us in a few words" value={a.other} onChange={(e) => setOther(q, e.target.value)} />
              )}
            </fieldset>
          );
        })}
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-pink-soft p-3 text-sm font-semibold text-pink">{error}</p>}

      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={back} disabled={idx === 0 || saving} className="btn btn-ghost"><ArrowLeft size={18} /> Back</button>
        <button type="button" onClick={next} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : isLast ? "See my plans" : "Next"} {!saving && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}