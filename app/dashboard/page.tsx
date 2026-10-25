import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionInfo } from "@/lib/supabase/server";
import { one, shortDate } from "@/lib/format";

export const metadata = { title: "My assessments | Mazbien IntelliHub" };

const STATUS: Record<string, { label: string; cls: string; note: string }> = {
  draft: { label: "In progress", cls: "bg-sun-soft text-ink", note: "Finish choosing your package and add-ons." },
  submitted: { label: "With a consultant", cls: "bg-brand-soft text-brand-deep", note: "A consultant is reviewing your choices." },
  approved: { label: "Approved", cls: "bg-mint-soft text-ink", note: "Reviewed and ready for next steps." },
};

type Org = { name: string; industry: string | null; owner_user_id: string | null; is_demo: boolean } | null;

export default async function Dashboard() {
  const { supabase, user, isConsultant } = await getSessionInfo();
  if (!user) redirect("/login?next=/dashboard");

  const { data } = await supabase
    .from("assessments")
    .select("id,status,created_at,submitted_at,organizations!inner(name,industry,owner_user_id,is_demo),assessment_package_choices(packages(name))")
    .order("created_at", { ascending: false });

  // Keep this user's own businesses plus the shared sample (demo) businesses. Own ones first.
  const rows = (data ?? [])
    .map((a) => ({ a, org: one(a.organizations as unknown as Org) }))
    .filter(({ org }) => org && (org.owner_user_id === user.id || org.is_demo))
    .sort((x, y) => Number(y.org?.owner_user_id === user.id) - Number(x.org?.owner_user_id === user.id));

  return (
    <section className="section py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">My assessments</h1>
          <p className="mt-2 text-ink/65">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-3">
          {isConsultant && <Link href="/consultant" className="btn btn-ghost">Consultant dashboard</Link>}
          <Link href="/assessment" className="btn btn-primary">Start a new assessment</Link>
        </div>
      </div>

      {!rows.length ? (
        <div className="panel mt-10 p-10 text-center">
          <h2 className="text-2xl font-bold">No assessments yet</h2>
          <p className="mt-2 text-ink/65">It takes about 5 minutes. You can save and finish later.</p>
          <Link href="/assessment" className="btn btn-primary mt-6">Start the assessment</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4">
          {rows.map(({ a, org }) => {
            const choice = one(a.assessment_package_choices as unknown as { packages: { name: string } | { name: string }[] | null } | null);
            const tier = one(choice?.packages ?? null)?.name;
            const s = STATUS[a.status] ?? STATUS.draft;
            const isDemo = !!org?.is_demo;
            const href = a.status === "draft" && !isDemo ? `/assessment/${a.id}` : `/dashboard/${a.id}`;
            return (
              <Link key={a.id} href={href} className="panel flex flex-wrap items-center justify-between gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div>
                  <h2 className="text-xl font-bold">
                    {org?.name}
                    {isDemo && <span className="chip ml-2 bg-sun-soft align-middle text-xs text-ink">Sample</span>}
                  </h2>
                  <p className="text-sm text-ink/60">{org?.industry} · started {shortDate(a.created_at)}{tier ? ` · ${tier} package` : ""}</p>
                  <p className="mt-1 text-sm text-ink/70">{s.note}</p>
                </div>
                <span className={`chip ${s.cls}`}>{s.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}