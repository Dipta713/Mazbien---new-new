export function money(n: number | null | undefined) {
  if (n === null || n === undefined) return "Custom quote";
  return "$" + Number(n).toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

export function priceLabel(p: { price_amount: number | null; price_type: string }) {
  return p.price_type === "quote" || p.price_amount === null ? "Custom quote" : money(p.price_amount);
}

/** PostgREST returns an object for to-one joins but an array in some cases. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function shortDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
