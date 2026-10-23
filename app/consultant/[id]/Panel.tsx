"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { priceLabel, shortDate } from "@/lib/format";
import type { Addon, Pkg } from "@/lib/types";

type Props = {
  assessmentId: string; userId: string; status: string; packages: Pkg[]; addons: Addon[];
  packageId: string | null; payment: string | null; addonIds: string[];
  recAddons: { addon_id: string; rationale: string }[];
  notes: { id: string; body: string; created_at: string }[];
};

export default function Panel(p: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError("");
    const { error } = await fn();
    setBusy(false);
    if (error) setError(error.message); else router.refresh();
  }

  const setTier = (package_id: string) =>
    run(() => supabase.from("assessment_package_choices").upsert({ assessment_id: p.assessmentId, package_id }, { onConflict: "assessment_id" }));
  const toggleAddon = (a: Addon) =>
    run(() => p.addonIds.includes(a.id)
      ? supabase.from("assessment_addons").delete().eq("assessment_id", p.assessmentId).eq("addon_id", a.id)
      : supabase.from("assessment_addons").insert({ assessment_id: p.assessmentId, addon_id: a.id, added_by: "consultant" }));
  const addNote = async () => {
    if (!note.trim()) return;
    await run(() => supabase.from("consultant_notes").insert({ assessment_id: p.assessmentId, author_id: p.userId, body: note.trim() }));
    setNote("");
  };
  const approve = () =>
    run(async () => {
      const a = await supabase.from("assessments").update({ status: "approved" }).eq("id", p.assessmentId);
      if (a.error) return a;
      await supabase.from("recommendation_addons").update({ approved_by_consultant: true })
        .in("recommendation_id", (await supabase.from("recommendations").select("id").eq("assessment_id", p.assessmentId)).data?.map((r) => r.id) ?? []);
      return supabase.from("recommendations").update({ status: "approved", approved_by: p.userId, approved_at: new Date().toISOString() }).eq("assessment_id", p.assessmentId);
    });

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-xl font-bold">Chosen package</h2>
        <p className="mt-1 text-sm text-ink/55">Client picked this. Change it if it does not match their needs.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {p.packages.map((x) => (
            <button key={x.id} disabled={busy} onClick={() => setTier(x.id)} aria-pressed={x.id === p.packageId}
              className={`rounded-xl border-2 p-3 text-left text-sm transition ${x.id === p.packageId ? "border-brand bg-brand-soft" : "border-ink/10 hover:border-brand/40"}`}>
              <b>{x.name}</b><br /><span className="text-ink/60">{priceLabel(x)}</span>
            </button>
          ))}
        </div>
        {p.payment && <p className="mt-3 text-sm text-ink/65">Payment preference: <b>{p.payment.replace(/_/g, " ")}</b></p>}
      </div>

      <div className="panel p-6">
        <h2 className="text-xl font-bold">Add-ons</h2>
        <ul className="mt-3 space-y-2">
          {p.addons.map((a) => {
            const on = p.addonIds.includes(a.id);
            const why = p.recAddons.find((r) => r.addon_id === a.id)?.rationale;
            if (!on && !why) return null;
            return (
              <li key={a.id} className="rounded-xl bg-paper p-3 text-sm">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-brand" checked={on} disabled={busy} onChange={() => toggleAddon(a)} />
                  <span><b>{a.name}</b> · {priceLabel(a)}{why && <><br /><span className="text-ink/60">{why}</span></>}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink/50">Showing selected and suggested add-ons. Checked = in the client&apos;s package.</p>
      </div>

      <div className="panel p-6">
        <h2 className="text-xl font-bold">Internal notes</h2>
        <p className="mt-1 text-sm text-ink/55">Never shown to the client.</p>
        <textarea className="input mt-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
        <button disabled={busy || !note.trim()} onClick={addNote} className="btn btn-dark mt-2 !py-2">Save note</button>
        <ul className="mt-4 space-y-2">
          {p.notes.map((n) => <li key={n.id} className="rounded-xl bg-sun-soft p-3 text-sm">{n.body}<br /><span className="text-xs text-ink/50">{shortDate(n.created_at)}</span></li>)}
        </ul>
      </div>

      {error && <p role="alert" className="rounded-xl bg-pink-soft p-3 text-sm font-semibold text-pink">{error}</p>}
      <button disabled={busy || p.status === "approved"} onClick={approve} className="btn btn-primary w-full">
        {p.status === "approved" ? "Approved ✓" : "Approve and mark ready to send"}
      </button>
    </div>
  );
}
