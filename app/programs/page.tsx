// ================================================================
// PROGRAMS PAGE  (app/programs/page.tsx)
// Markers: PROGRAMS - LIST (the 3 program cards) | PROGRAMS - AI FOR BUSINESS (dark box)
//          | PROGRAMS - OTHER (consultation section)
// ================================================================
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";

export const metadata = { title: "Programs | Mazbien IntelliHub" };

// >>> EDIT HERE: PROGRAMS - LIST (id, title, photo, text) <<<
const LIST = [
  { id: "bootcamps", title: "AI & Tech Bootcamps", photo: PHOTOS.code, text: "A hands-on experience where you code, build chatbots, design websites and create projects you can turn into income. No prior experience required." },
  { id: "tech-camp", title: "Tech Camp", photo: PHOTOS.workshop, text: "Small-group camps for kids and teens that turn screen time into building time: games, websites and first AI projects with friendly mentors." },
  { id: "mentorship", title: "1:1 Startup Guide & Mentorship", photo: PHOTOS.mentor, text: "Two focused hours with a mentor to map your path into AI and remote tech roles." },
];

export default function Programs() {
  return (
    <>
      <section className="section pb-6 pt-14">
        <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-tight sm:text-6xl">Programs that help you <span className="pop">learn, build and grow</span></h1>
      </section>

      {/* >>> EDIT HERE: PROGRAMS - AI FOR BUSINESS (dark box with the assessment button) <<< */}
      <section id="ai-for-business" className="section scroll-mt-28 pb-10">
        <div className="grid overflow-hidden rounded-[2rem] bg-ink text-white md:grid-cols-[1.2fr_1fr]">
          <div className="p-8 sm:p-12">
            <span className="chip bg-sun text-ink">New for businesses</span>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Help your business and your team <span className="text-sun">work smarter with AI</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/75">
              Most teams do not need a generic AI course. They need to know which AI skills fit the work they already do. Answer a few tap-to-choose questions and we will point you to the training that fits your people, your tools and your goals.
            </p>
            <ul className="mt-6 space-y-2 text-white/85">
              {["Built for owners and their employees", "Takes about 5 minutes, mostly tapping options", "Every suggestion comes with a plain reason why", "A Mazbien consultant reviews before anything is final. Nothing is billed."].map((t) => (
                <li key={t} className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-sun" />{t}</li>
              ))}
            </ul>
            <Link href="/assessment" className="btn btn-sun mt-8">Take the AI assessment <ArrowRight size={18} /></Link>
          </div>
          <Photo src={PHOTOS.meeting} alt="A team discussing how to use AI in their work" className="min-h-[240px] w-full" />
        </div>
      </section>

      {/* >>> EDIT HERE: PROGRAMS - OTHER (consultation section) <<< */}
      <section className="section space-y-8 pb-6">
        <h2 className="font-display text-3xl font-extrabold">More programs</h2>
        {LIST.map((p, i) => (
          <article key={p.id} id={p.id} className="scroll-mt-28 overflow-hidden rounded-[2rem] bg-white shadow-tile">
            <div className={`grid items-center md:grid-cols-2 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
              <div className="p-8 sm:p-12">
                <h3 className="font-display text-3xl font-extrabold">{p.title}</h3>
                <p className="mt-3 text-lg text-ink/70">{p.text}</p>
                <Link href="/contact" className="btn btn-primary mt-6">Book a consultation</Link>
              </div>
              <Photo src={p.photo} alt={p.title} className="aspect-[4/3] h-full w-full" />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
