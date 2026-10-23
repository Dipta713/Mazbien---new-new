// ================================================================
// HOME PAGE  (app/page.tsx)
// Want to change the home screen? Send me ONLY the part you want
// changed. Look for these markers:
//   >>> EDIT HERE: HOME - PROGRAM CARDS (the 3 cards)
//   >>> EDIT HERE: HOME - FAQ LIST
//   >>> EDIT HERE: HOME - HERO (big headline + buttons + photo)
//   >>> EDIT HERE: HOME - PROGRAMS SECTION + BUSINESS BANNER
//   >>> EDIT HERE: HOME - FAQ SECTION
//   >>> EDIT HERE: HOME - BOTTOM CTA
// ================================================================
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";

// >>> EDIT HERE: HOME - PROGRAM CARDS (title, text, photo, link) <<<
const PROGRAMS = [
  { title: "AI & Tech Bootcamps", text: "Code, build a chatbot, design a website and ship a project. No experience needed.", photo: PHOTOS.code, href: "/programs#bootcamps" },
  { title: "Tech Camp for Kids & Teens", text: "Screen time that builds something. Small groups, real projects, friendly mentors.", photo: PHOTOS.workshop, href: "/programs#tech-camp" },
  { title: "1:1 Mentorship", text: "Two focused hours with a mentor to map out your next move in tech.", photo: PHOTOS.mentor, href: "/programs#mentorship" },
];

// >>> EDIT HERE: HOME - FAQ LIST (question, answer) <<<
const FAQ = [
  ["Do I (or my child) need coding or tech experience?", "No. Every program starts from zero and builds up, for adults, teens and kids."],
  ["Where do programs take place?", "At our Calgary centre, fully online, or a mix of both. You pick what suits your schedule."],
  ["Is it just screen time?", "No. Each session is hands-on: you build, test and fix real things with a mentor beside you."],
  ["How do consulting services work for businesses?", "We start with your goals and challenges, then work with you on practical steps, from analytics to AI adoption. Book a free chat to talk it through."],
];

export default function Home() {
  return (
    <>
      {/* >>> EDIT HERE: HOME - HERO (big headline, subtext, buttons, tick list, photo) <<< */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="section grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="rise chip bg-white text-brand-deep shadow-tile"><Sparkles size={14} className="mr-1.5" /> Calgary tech and AI training hub</p>
            <h1 className="rise rise-2 mt-5 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              From <span className="pop">emerging tech</span> to <span className="mark">real-world</span> results.
            </h1>
            <p className="rise rise-3 mt-6 max-w-xl text-lg text-ink/70">
              Structured, hands-on tech and AI training for kids, teens, professionals and businesses. No prior experience needed.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link href="/programs" className="btn btn-primary">Explore programs <ArrowRight size={18} /></Link>
              <Link href="/contact" className="btn btn-ghost">Book a consultation</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink/70">
              <li className="flex items-center gap-1.5"><Check size={16} className="text-brand" /> Online or in person</li>
              <li className="flex items-center gap-1.5"><Check size={16} className="text-brand" /> No experience needed</li>
              <li className="flex items-center gap-1.5"><Check size={16} className="text-brand" /> Kids, teens and professionals</li>
            </ul>
          </div>

          <div className="relative">
            <Photo src={PHOTOS.hero} alt="People collaborating at laptops during a workshop" className="aspect-[4/5] w-full rounded-[2rem] shadow-lift sm:aspect-[5/5]" />
            <div className="floaty absolute -left-4 bottom-10 rounded-2xl bg-white p-4 shadow-lift sm:-left-10" style={{ ["--r" as string]: "-3deg" }}>
              <p className="font-display text-lg font-extrabold">Hands-on learning</p>
              <p className="text-sm text-ink/65">Build real projects with a mentor</p>
            </div>
            <div className="floaty absolute -right-2 top-8 rounded-2xl bg-sun p-4 shadow-lift sm:-right-6" style={{ ["--r" as string]: "4deg", animationDelay: "1.2s" }}>
              <p className="font-display text-xl font-extrabold">Beginner</p>
              <p className="text-sm font-semibold">friendly</p>
            </div>
          </div>
        </div>
      </section>

      {/* >>> EDIT HERE: HOME - PROGRAMS SECTION + dark business banner <<< */}
      <section className="section py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-display text-4xl font-extrabold sm:text-5xl">Learn what is <span className="pop">next</span>, hands-on</h2>
          <Link href="/programs" className="btn btn-ghost">See all programs</Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PROGRAMS.map((p) => (
            <Link key={p.title} href={p.href} className="group overflow-hidden rounded-3xl bg-white shadow-tile transition hover:-translate-y-1 hover:shadow-lift">
              <Photo src={p.photo} alt={p.title} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03]" />
              <div className="p-6">
                <h3 className="text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-ink/70">{p.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-bold text-brand-deep">Learn more <ArrowRight size={16} /></span>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/programs#ai-for-business" className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-ink p-6 text-white transition hover:bg-ink/90 sm:p-8">
          <div>
            <p className="font-display text-2xl font-extrabold">Running a business? Help your team work smarter with AI.</p>
            <p className="mt-1 text-white/70">Take our short assessment to find the right training for your team.</p>
          </div>
          <span className="btn btn-sun">See how it works <ArrowRight size={18} /></span>
        </Link>
      </section>

      {/* >>> EDIT HERE: HOME - FAQ SECTION (heading on the left; questions come from FAQ list at top) <<< */}
      <section className="section grid gap-10 py-16 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Got <span className="mark">questions?</span></h2>
          <p className="mt-4 text-ink/70">Short answers below. For anything else, book a free chat.</p>
          <Link href="/contact" className="btn btn-primary mt-6">Talk to us</Link>
        </div>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-white p-5 shadow-tile open:ring-2 open:ring-brand/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q}<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* >>> EDIT HERE: HOME - BOTTOM CTA (orange box) <<< */}
      <section className="section">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand p-10 text-white sm:p-16">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-sun/50 blur-2xl" aria-hidden />
          <h2 className="relative max-w-2xl font-display text-4xl font-extrabold sm:text-5xl">Ready to connect with <span className="text-ink">the future?</span></h2>
          <p className="relative mt-4 max-w-xl text-white/90">Do not guess your way through the digital shift. Book a free chat to find the right tools and training for your goals.</p>
          <div className="relative mt-8">
            <Link href="/contact" className="btn bg-white text-ink hover:bg-white/90">Book a free consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
