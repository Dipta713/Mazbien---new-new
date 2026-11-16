// Builds "what did this client pick and what does it cost" from the database.
// Used by the deposit email, the booking email and the dashboard, so the numbers always match.
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/format";

export const DEPOSIT_AMOUNT = 100; // CAD, same as the Stripe deposit

export type Quote = {
  orgName: string;
  packageName: string | null;
  packagePrice: number | null;
  packageIsQuote: boolean;
  addons: { name: string; price: number | null; isQuote: boolean }[];
  addonTotal: number;
  total: number | null; // null when the package is a custom quote
  depositStatus: "none" | "demo" | "paid";
  receiptUrl: string | null;
  paidAt: string | null;
};

type PriceRow = { name: string; price_amount: number | null; price_type: string };

export async function getQuote(supabase: ReturnType<typeof createClient>, assessmentId: string): Promise<Quote | null> {
  const { data: a } = await supabase.from("assessments").select("id,organizations(name)").eq("id", assessmentId).maybeSingle();
  if (!a) return null;
  const org = one(a.organizations as { name: string } | { name: string }[] | null);

  const { data: c } = await supabase
    .from("assessment_package_choices")
    .select("deposit_status,receipt_url,paid_at,packages(name,price_amount,price_type)")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  const { data: ad } = await supabase.from("assessment_addons").select("addons(name,price_amount,price_type)").eq("assessment_id", assessmentId);

  const pkg = one(c?.packages as PriceRow | PriceRow[] | null | undefined);
  const addons = ((ad ?? []) as { addons: PriceRow | PriceRow[] | null }[])
    .map((r) => one(r.addons))
    .filter((x): x is PriceRow => !!x)
    .map((x) => ({ name: x.name, price: x.price_amount, isQuote: x.price_type === "quote" || x.price_amount === null }));

  const packageIsQuote = !pkg || pkg.price_type === "quote" || pkg.price_amount === null;
  const addonTotal = addons.reduce((sum, x) => sum + (x.isQuote ? 0 : x.price ?? 0), 0);
  return {
    orgName: org?.name ?? "Your business",
    packageName: pkg?.name ?? null,
    packagePrice: pkg?.price_amount ?? null,
    packageIsQuote,
    addons,
    addonTotal,
    total: packageIsQuote ? null : (pkg?.price_amount ?? 0) + addonTotal,
    depositStatus: ((c?.deposit_status as Quote["depositStatus"]) ?? "none"),
    receiptUrl: (c?.receipt_url as string | null) ?? null,
    paidAt: (c?.paid_at as string | null) ?? null,
  };
}
