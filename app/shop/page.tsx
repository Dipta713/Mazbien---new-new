import Link from "next/link";

export const metadata = { title: "Shop | Mazbien IntelliHub" };

// >>> EDIT HERE: SHOP - PRODUCTS (name, price, note, old price) <<<
// Sample catalogue for the prototype. Replace with Mazbien's real products.
const PRODUCTS = [
  { name: "AI Focused Academy (Pay Later)", price: "$540", note: "Pay in instalments after you start.", was: null },
  { name: "AI Focused Academy (After Pay)", price: "$540", note: "Split into smaller payments.", was: null },
  { name: "2 hr 1:1 Startup Guide & Mentorship", price: "$200", note: "AI remote role roadmap.", was: "$250" },
  { name: "Weekend AI Remote Roles Training", price: "$100", note: "A weekend intensive.", was: "$150" },
];

export default function Shop() {
  // >>> EDIT HERE: SHOP - PAGE HEADING + grid below (products come from PRODUCTS above) <<<
  return (
    <section className="section py-16">
      <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Curated tech <span className="mark">and learning kits</span></h1>
      <p className="mt-4 max-w-xl text-ink/70">Sample products for this prototype. Checkout is not connected yet, so use the button to ask us about any of them.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <div key={p.name} className="flex flex-col rounded-3xl bg-white p-6 shadow-tile">
            <div className="grid h-32 place-items-center rounded-2xl bg-gradient-to-br from-brand-soft to-sun-soft font-display text-4xl font-extrabold text-brand">AI</div>
            <h2 className="mt-4 text-lg font-bold">{p.name}</h2>
            <p className="mt-1 flex-1 text-sm text-ink/65">{p.note}</p>
            <p className="mt-3 font-display text-2xl font-extrabold">{p.price} {p.was && <s className="text-base font-medium text-ink/40">{p.was}</s>}</p>
            <Link href="/contact" className="btn btn-dark mt-4 !py-2.5">Ask about this</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
