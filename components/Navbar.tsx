"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, ShoppingCart, X } from "lucide-react";
import Logo from "./Logo";

type Props = { email: string | null; isConsultant: boolean };

// >>> EDIT HERE: NAVBAR - Programs dropdown items (label, note, link, badge) <<<
const PROGRAMS = [
  { href: "/programs#bootcamps", label: "AI & Tech Bootcamps", note: "Hands-on, no experience needed" },
  { href: "/programs#tech-camp", label: "Tech Camp", note: "For kids and teens" },
  { href: "/assessment", label: "AI Training Needs Assessment", note: "Find the right training for your team", badge: "New" },
];

export default function Navbar({ email, isConsultant }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = "rounded-full px-4 py-2 text-[15px] font-semibold text-ink/80 transition hover:bg-brand-soft hover:text-brand-deep";

  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-paper/90 backdrop-blur">
      <div className="section flex h-[72px] items-center justify-between">
        <Logo />

        {/* >>> EDIT HERE: NAVBAR - DESKTOP MENU LINKS (Home, About, Programs, Shop, Contact) <<< */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link href="/" className={link}>Home</Link>
          <Link href="/about" className={link}>About</Link>

          <div className="group relative">
            <Link href="/programs" className={`${link} inline-flex items-center gap-1`}>
              Programs <ChevronDown size={16} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </Link>
            <div className="invisible absolute left-0 top-full w-80 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-2xl bg-white p-2 shadow-lift ring-1 ring-ink/5">
                {PROGRAMS.map((p) => (
                  <Link key={p.href} href={p.href} className="block rounded-xl px-4 py-3 transition hover:bg-brand-soft">
                    <span className="flex items-center gap-2 text-[15px] font-bold">
                      {p.label}
                      {p.badge && <span className="chip bg-sun text-ink">{p.badge}</span>}
                    </span>
                    <span className="text-sm text-ink/60">{p.note}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/shop" className={link}>Shop</Link>
          <Link href="/contact" className={link}>Contact</Link>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap lg:flex">
          <Link href="/shop" aria-label="Cart" className="rounded-full p-2.5 text-ink/70 hover:bg-brand-soft">
            <ShoppingCart size={20} />
          </Link>
          {email ? (
            <>
              <Link href={isConsultant ? "/consultant" : "/dashboard"} className={link}>
                {isConsultant ? "Consultant dashboard" : "My assessments"}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="btn btn-ghost whitespace-nowrap !py-2">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className={link}>Sign in</Link>
          )}
          {/* >>> EDIT HERE: NAVBAR - "Get started" button (only shows when signed OUT) <<< */}
          {!email && <Link href="/assessment" className="btn btn-primary !py-2.5">Get started</Link>}
        </div>

        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* >>> EDIT HERE: NAVBAR - MOBILE MENU (keep the links the same as the desktop menu) <<< */}
      {open && (
        <div className="border-t border-ink/5 bg-white lg:hidden">
          <div className="section flex flex-col gap-1 py-4">
            {[["/", "Home"], ["/about", "About"], ["/programs", "Programs"]].map(([h, l]) => (
              <Link key={h} href={h} onClick={close} className="rounded-xl px-3 py-3 font-semibold">{l}</Link>
            ))}
            <div className="ml-3 flex flex-col border-l-2 border-brand/20 pl-3">
              {PROGRAMS.map((p) => (
                <Link key={p.href} href={p.href} onClick={close} className="flex items-center gap-2 py-2 text-[15px] text-ink/80">
                  {p.label} {p.badge && <span className="chip bg-sun text-ink">{p.badge}</span>}
                </Link>
              ))}
            </div>
            <Link href="/shop" onClick={close} className="rounded-xl px-3 py-3 font-semibold">Shop</Link>
            <Link href="/contact" onClick={close} className="rounded-xl px-3 py-3 font-semibold">Contact</Link>
            {email ? (
              <>
                <Link href={isConsultant ? "/consultant" : "/dashboard"} onClick={close} className="rounded-xl px-3 py-3 font-semibold">
                  {isConsultant ? "Consultant dashboard" : "My assessments"}
                </Link>
                <form action="/auth/signout" method="post"><button className="w-full rounded-xl px-3 py-3 text-left font-semibold">Sign out</button></form>
              </>
            ) : (
              <Link href="/login" onClick={close} className="rounded-xl px-3 py-3 font-semibold">Sign in</Link>
            )}
            {!email && <Link href="/assessment" onClick={close} className="btn btn-primary mt-2">Get started</Link>}
          </div>
        </div>
      )}
    </header>
  );
}