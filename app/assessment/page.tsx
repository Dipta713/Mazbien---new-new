import Wizard from "./Wizard";
import { createClient } from "@/lib/supabase/server";
import type { Department, Question } from "@/lib/types";

export const metadata = { title: "AI Training Needs Assessment | Mazbien IntelliHub" };

export default async function AssessmentPage() {
  const supabase = createClient();
  const [{ data: questions, error: qErr }, { data: departments }] = await Promise.all([
    supabase
      .from("questions")
      .select("id,question_key,prompt,help_text,input_type,section,required,max_selections,display_order,condition_json,question_options(id,option_key,label,is_other,display_order)")
      .eq("active", true)
      .order("display_order"),
    supabase.from("departments").select("id,slug,name,is_other").eq("active", true),
  ]);

  if (qErr || !questions?.length) {
    return (
      <div className="section py-20">
        <div className="panel max-w-xl p-8">
          <h1 className="font-display text-2xl font-extrabold">Questions are not loaded yet</h1>
          <p className="mt-2 text-ink/70">Run the SQL files in <code>supabase/</code> (schema, then reference data) and refresh this page.</p>
        </div>
      </div>
    );
  }

  const qs = (questions as Question[]).map((q) => ({
    ...q,
    question_options: [...q.question_options].sort((a, b) => a.display_order - b.display_order),
  }));
  const deps = ((departments ?? []) as Department[]).sort((a, b) => Number(a.is_other) - Number(b.is_other) || a.name.localeCompare(b.name));
  return <Wizard questions={qs} departments={deps} />;
}
