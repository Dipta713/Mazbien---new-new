import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import { one, shortDate } from "@/lib/format";

export const metadata = { title: "Consultant dashboard | Mazbien IntelliHub" };

const CHIP: Record<string, string> = { submitted: "bg-brand-soft text-brand-deep", approved: "bg-mint-soft text-ink" };

export default async function ConsultantHome({ searchParams }: { searchParams: { status?: string } }) {
  const { supabase, user, isConsultant } = await getSessionInfo();
  if (!user) redirect("/login?next=/consultant");
  if (!isConsultant) {
    return (
      <section className="section py-20">
        <div className="panel max-w-xl p-8">
          <h1 className="font-display text-3xl font-extrabold">Consultants only</h1>
          <p className="mt-2 text-ink/70">This area is limited to Mazbien consultants. Your account does not have that role.</p>
          <Link href="/dashboard" className="btn btn-primary mt-6">Go to my assessments</Link>
        </div>
      </section>
    );
  }

  const { data } = await supabase
    .from("assessments")
    .select("id,status,submitted_at,organizations(name,industry,employee_range),assessment_package_choices(packages(name))")
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false });

  const rows = (data ?? []).map((a) => {
    const org = one(a.organizations as unknown as { name: string; industry: string | null; employee_range: string | null } | null);
    const choice = one(a.assessment_package_choices as unknown as { packages: { name: string } | { name: string }[] | null } | null);
    return { id: a.id, status: a.status, submitted_at: a.submitted_at, org, tier: one(choice?.packages ?? null)?.name ?? "—" };
  });
  const filter = searchParams.status;
  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  const tab = (label: string, value?: string) => (
    <Link href={value ? `/consultant?status=${value}` : "/consultant"} className={`chip !px-4 !py-2 text-sm ${filter === value || (!filter && !value) ? "bg-ink text-white" : "bg-white text-ink shadow-tile"}`}>{label}</Link>
  );

  return (
    <section className="section py-12">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Consultant <span className="pop">dashboard</span></h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["Submitted", rows.length, "bg-brand-soft"], ["Waiting for review", count("submitted"), "bg-sun-soft"], ["Approved", count("approved"), "bg-mint-soft"]].map(([l, n, c]) => (
          <div key={l as string} className={`rounded-3xl p-6 ${c}`}><p className="font-display text-4xl font-extrabold">{n}</p><p className="font-semibold text-ink/70">{l}</p></div>
        ))}
      </div>

      <div className="mt-8 flex gap-2">{tab("All")}{tab("Waiting for review", "submitted")}{tab("Approved", "approved")}</div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/55"><tr>
            <th className="p-4 font-bold">Organization</th><th className="p-4 font-bold">Industry</th><th className="p-4 font-bold">Size</th>
            <th className="p-4 font-bold">Chosen tier</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Submitted</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-ink/5 last:border-0 hover:bg-brand-soft/40">
                <td className="p-4 font-bold"><Link href={`/consultant/${r.id}`} className="text-brand-deep hover:underline">{r.org?.name}</Link></td>
                <td className="p-4">{r.org?.industry}</td>
                <td className="p-4">{r.org?.employee_range}</td>
                <td className="p-4">{r.tier}</td>
                <td className="p-4"><span className={`chip ${CHIP[r.status]}`}>{r.status === "submitted" ? "Waiting" : "Approved"}</span></td>
                <td className="p-4">{shortDate(r.submitted_at)}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="p-8 text-center text-ink/55">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
