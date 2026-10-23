import { notFound } from "next/navigation";
import Checkout from "./Checkout";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/format";
import type { Addon, Pkg } from "@/lib/types";

export const metadata = { title: "Your plan | Mazbien IntelliHub" };

export default async function AssessmentFlow({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const id = params.id;

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id,status,organizations(name)")
    .eq("id", id)
    .maybeSingle();
  if (!assessment) notFound();

  const [{ data: rec }, { data: packages }, { data: addons }, { data: choice }, { data: chosenAddons }] = await Promise.all([
    supabase.from("recommendations").select("id,client_summary,recommendation_items(title,rationale,priority,sequence_order),recommendation_addons(addon_id,rationale)").eq("assessment_id", id).maybeSingle(),
    supabase.from("packages").select("*").eq("active", true).order("display_order"),
    supabase.from("addons").select("*").eq("active", true).order("category").order("name"),
    supabase.from("assessment_package_choices").select("package_id,payment_preference").eq("assessment_id", id).maybeSingle(),
    supabase.from("assessment_addons").select("addon_id").eq("assessment_id", id),
  ]);

  const org = one(assessment.organizations as { name: string } | { name: string }[] | null);
  return (
    <Checkout
      assessmentId={id}
      status={assessment.status}
      orgName={org?.name ?? "Your business"}
      summary={rec?.client_summary ?? ""}
      items={(rec?.recommendation_items ?? []).sort((a, b) => a.sequence_order - b.sequence_order)}
      recAddons={rec?.recommendation_addons ?? []}
      packages={(packages ?? []) as Pkg[]}
      addons={(addons ?? []) as Addon[]}
      initialPackageId={choice?.package_id ?? null}
      initialPayment={choice?.payment_preference ?? null}
      initialAddonIds={(chosenAddons ?? []).map((a) => a.addon_id)}
    />
  );
}
