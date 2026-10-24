"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, priceLabel } from "@/lib/format";
import type { Addon, Pkg } from "@/lib/types";

type Step = "plans" | "addons" | "summary" | "payment" | "done";
type Props = {
  assessmentId: string; status: string; orgName: string; summary: string;
  items: { title: string; rationale: string; priority: string; module_name?: string | null }[];
  recAddons: { addon_id: string; rationale: string }[];
  suggestedPackageId: string | null;
  packages: Pkg[]; addons: Addon[];
  initialPackageId: string | null; initialPayment: string | null; initialAddonIds: string[];
};

const PAY = [
  { key: "invoice", label: "Invoice", note: "We send an invoice after the consultant approves." },
  { key: "card_on_consultation", label: "Credit card on consultation", note: "Pay by card once we have talked it through." },
  { key: "pay_later", label: "Pay later / instalments", note: "Split the cost into smaller payments." },
  { key: "not_sure", label: "Not sure yet", note: "Decide with the consultant." },
];
const LABELS: Record<string, string> = { plans: "Package", addons: "Add-ons", summary: "Review", payment: "Payment" };

export default function Checkout(p: Props) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>(p.status === "draft" ? "plans" : "done");
  // Start on the package the system suggests, unless the client already chose one
  const [pkgId, setPkgId] = useState<string | null>(p.initialPackageId ?? p.suggestedPackageId);
  const [addonIds, setAddonIds] = useState<string[]>(p.initialAddonIds);
  const [pay, setPay] = useState<string | null>(p.initialPayment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pkg = p.packages.find((x) => x.id === pkgId) ?? null;
  const suggestedPkg = p.packages.find((x) => x.id === p.suggestedPackageId) ?? null;
  const fitItem = p.items.find((i) => i.module_name === "package_fit");
  const otherItems = p.items.filter((i) => i.module_name !== "package_fit");
  const chosenAddons = p.addons.filter((a) => addonIds.includes(a.id));
  const reasonFor = (id: string) => p.recAddons.find((r) => r.addon_id === id)?.rationale;
  const suggested = p.addons.filter((a) => p.recAddons.some((r) => r.addon_id === a.id));
  const others = p.addons.filter((a) => !p.recAddons.some((r) => r.addon_id === a.id));
  const addonTotal = chosenAddons.reduce((s, a) => s + (a.price_amount ?? 0), 0);
  const isQuote = pkg?.price_type === "quote";
  const total = pkg && !isQuote ? (pkg.price_amount ?? 0) + addonTotal : null;

  const go = (s: Step) => { setError(""); setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const fail = (e: unknown) => { setBusy(false); setError((e as { message?: string })?.message ?? "Something went wrong."); };

  async function savePackage() {
    if (!pkgId) return setError("Pick a package to continue.");
    setBusy(true);
    const { error } = await supabase.from("assessment_package_choices").upsert({ assessment_id: p.assessmentId, package_id: pkgId }, { onConflict: "assessment_id" });
    setBusy(false);
    if (error) return fail(error);
    go("addons");
  }
  async function saveAddons() {
    setBusy(true);
    const del = await supabase.from("assessment_addons").delete().eq("assessment_id", p.assessmentId);
    if (del.error) return fail(del.error);
    if (addonIds.length) {
      const ins = await supabase.from("assessment_addons").insert(addonIds.map((addon_id) => ({ assessment_id: p.assessmentId, addon_id })));
      if (ins.error) return fail(ins.error);
    }
    setBusy(false);
    go("summary");
  }
  async function submit() {
    if (!pay) return setError("Pick how you would like to pay. You can change it later.");
    setBusy(true);
    const a = await supabase.from("assessment_package_choices").update({ payment_preference: pay }).eq("assessment_id", p.assessmentId);
    if (a.error) return fail(a.error);
    const b = await supabase.from("assessments").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", p.assessmentId);
    if (b.error) return fail(b.error);
    setBusy(false);
    go("done");
  }

  const AddonCard = ({ a }: { a: Addon }) => {
    const on = addonIds.includes(a.id);
    const why = reasonFor(a.id);
    return (
      <button type="button" aria-pressed={on} onClick={() => setAddonIds(on ? addonIds.filter((x) => x !== a.id) : [...addonIds, a.id])}
        className={`flex w-full flex-col rounded-2xl border-2 p-5 text-left transition ${on ? "border-brand bg-brand-soft shadow-tile" : "border-ink/10 bg-white hover:border-brand/40"}`}>
        <span className="flex items-start justify-between gap-3">
          <span className="text-[16px] font-bold">{a.name}</span>
          <span className="shrink-0 font-display text-lg font-extrabold">{priceLabel(a)}</span>
        </span>
        <span className="mt-1 text-sm text-ink/65">{a.description}</span>
        {why && <span className="mt-3 rounded-xl bg-sun-soft p-3 text-sm"><b>Why this was suggested: </b>{why}</span>}
        <span className={`mt-3 text-sm font-bold ${on ? "text-brand-deep" : "text-ink/50"}`}>{on ? "✓ Added" : "Tap to add"}</span>
      </button>
    );
  };

  if (step === "done") {
    return (
      <div className="section max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mint text-white"><PartyPopper size={36} /></div>
        <h1 className="mt-6 font-display text-4xl font-extrabold sm:text-5xl">Sent to a Mazbien <span className="mark">consultant</span></h1>
        <p className="mt-4 text-lg text-ink/70">Thanks, {p.orgName}. A consultant will review your package and add-ons, adjust anything that does not fit, and get back to you. <b>Nothing has been billed.</b></p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">See my assessments</Link>
          <Link href="/" className="btn btn-ghost">Back to home</Link>
        </div>
      </div>
    );
  }

  const order: Step[] = ["plans", "addons", "summary", "payment"];
  return (
    <div className="section py-10">
      <ol className="mb-8 flex flex-wrap gap-2 text-sm font-bold" aria-label="Progress">
        {order.map((s, i) => (
          <li key={s} className={`chip !px-4 !py-2 ${s === step ? "bg-brand text-white" : order.indexOf(step) > i ? "bg-mint-soft text-ink" : "bg-ink/5 text-ink/50"}`}>
            {order.indexOf(step) > i && <Check size={14} className="mr-1" />}{LABELS[s]}
          </li>
        ))}
      </ol>

      {step === "plans" && (
        <>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Choose your <span className="pop">package</span></h1>
          {p.summary && <p className="mt-4 max-w-3xl rounded-2xl bg-white p-5 text-ink/75 shadow-tile">{p.summary}</p>}
          {otherItems.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {otherItems.slice(0, 4).map((i) => (
                <div key={i.title} className="rounded-2xl bg-white p-4 shadow-tile">
                  <p className="font-bold">{i.title} {i.priority === "high" && <span className="chip ml-1 bg-pink-soft text-pink">Priority</span>}</p>
                  <p className="mt-1 text-sm text-ink/65">{i.rationale}</p>
                </div>
              ))}
            </div>
          )}
          {suggestedPkg && (
            <div className="mt-6 max-w-3xl rounded-2xl border-2 border-mint bg-mint-soft p-5">
              <p className="font-bold">We recommend {suggestedPkg.name} for {p.orgName}</p>
              {fitItem && <p className="mt-1 text-sm text-ink/75">{fitItem.rationale}</p>}
              <p className="mt-2 text-sm text-ink/60">This is a starting point. Pick any package you like and a consultant will review it.</p>
            </div>
          )}
          <p className="mt-4 text-sm text-ink/55">We suggest a package from your answers, but you choose. Prices are examples while the program is finalized.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {p.packages.map((x) => {
              const sel = x.id === pkgId;
              return (
                <div key={x.id} className={`relative flex flex-col rounded-3xl p-6 transition ${sel ? "bg-brand text-white shadow-lift" : "bg-white shadow-tile"}`}>
                  {x.slug === "gold" && <span className="chip absolute -top-3 right-5 bg-sun text-ink">Most popular</span>}
                  {x.id === p.suggestedPackageId && <span className="chip absolute -top-3 left-5 bg-mint text-white">Recommended for you</span>}
                  <h2 className="font-display text-2xl font-extrabold">{x.name}</h2>
                  <p className={`text-sm ${sel ? "text-white/75" : "text-ink/60"}`}>{x.tagline}</p>
                  <p className="mt-4 font-display text-3xl font-extrabold">{priceLabel(x)}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {(x.included_details.features ?? []).map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" />{f}</li>)}
                  </ul>
                  <button type="button" onClick={() => setPkgId(x.id)} aria-pressed={sel} className={`btn mt-6 ${sel ? "bg-sun text-ink" : "btn-dark"}`}>
                    {sel ? "Selected ✓" : `Choose ${x.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === "addons" && (
        <>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Add what <span className="mark">you need</span></h1>
          <p className="mt-3 max-w-2xl text-ink/70">Add-ons work with any package. Each suggestion shows why it was picked, based on your answers.</p>
          {suggested.length > 0 && (
            <>
              <h2 className="mt-8 text-xl font-bold">Suggested for you</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">{suggested.map((a) => <AddonCard key={a.id} a={a} />)}</div>
            </>
          )}
          <h2 className="mt-10 text-xl font-bold">All other add-ons</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">{others.map((a) => <AddonCard key={a.id} a={a} />)}</div>
        </>
      )}

      {step === "summary" && (
        <>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Review your <span className="pop">choices</span></h1>
          <div className="panel mt-8 divide-y divide-ink/5">
            <div className="flex items-center justify-between p-6">
              <div><p className="text-sm font-bold text-ink/50">Package</p><p className="font-display text-2xl font-extrabold">{pkg?.name}</p></div>
              <p className="font-display text-2xl font-extrabold">{pkg ? priceLabel(pkg) : ""}</p>
            </div>
            {chosenAddons.length === 0 && <p className="p-6 text-ink/60">No add-ons selected. That is fine, you can talk it through with the consultant.</p>}
            {chosenAddons.map((a) => (
              <div key={a.id} className="p-6">
                <div className="flex items-center justify-between"><p className="font-bold">{a.name}</p><p className="font-bold">{priceLabel(a)}</p></div>
                <p className="mt-1 text-sm text-ink/65">{reasonFor(a.id) ?? "You added this yourself."}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-sun-soft p-6">
              <p className="font-bold">{isQuote ? "Estimated total" : "Estimated total"}</p>
              <p className="font-display text-3xl font-extrabold">{total !== null ? money(total) : `Custom quote${addonTotal ? ` + ${money(addonTotal)} add-ons` : ""}`}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/55">Prices are placeholders. A consultant confirms the final price. Nothing is charged here.</p>
        </>
      )}

      {step === "payment" && (
        <>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">How would you like to <span className="mark">pay</span>?</h1>
          <p className="mt-3 max-w-2xl text-ink/70">This only tells us your preference. <b>No card details are collected and nothing is charged.</b></p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {PAY.map((o) => (
              <button key={o.key} type="button" aria-pressed={pay === o.key} onClick={() => setPay(o.key)}
                className={`rounded-2xl border-2 p-5 text-left transition ${pay === o.key ? "border-brand bg-brand-soft shadow-tile" : "border-ink/10 bg-white hover:border-brand/40"}`}>
                <p className="font-bold">{o.label}</p><p className="mt-1 text-sm text-ink/65">{o.note}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-6 rounded-xl bg-pink-soft p-3 text-sm font-semibold text-pink">{error}</p>}

      <div className="mt-10 flex items-center justify-between">
        <button type="button" disabled={step === "plans" || busy} onClick={() => go(order[order.indexOf(step) - 1])} className="btn btn-ghost"><ArrowLeft size={18} /> Back</button>
        {step !== "payment" ? (
          <button type="button" disabled={busy} className="btn btn-primary"
            onClick={() => step === "plans" ? savePackage() : step === "addons" ? saveAddons() : go("payment")}>
            {step === "addons" ? "Review my choices" : step === "summary" ? "Choose payment preference" : "Continue"} <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={submit} className="btn btn-primary">{busy ? "Sending…" : "Send for review"}</button>
        )}
      </div>
    </div>
  );
}