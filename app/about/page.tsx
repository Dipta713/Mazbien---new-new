// ================================================================
// ABOUT PAGE  (app/about/page.tsx)
// Want to change the About page? Send me ONLY the marked part:
//   >>> EDIT HERE: ABOUT - INTRO   |   ABOUT - THREE CARDS   |   ABOUT - MISSION
// ================================================================
import Link from "next/link";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";

export const metadata = { title: "About | Mazbien IntelliHub" };

export default function About() {
  return (
    <>
      {/* >>> EDIT HERE: ABOUT - INTRO (headline, two paragraphs, photo) <<< */}
      <section className="section grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-tight sm:text-6xl">Who is <span className="pop">Mazbien IntelliHub</span>?</h1>
          <p className="mt-6 text-lg text-ink/70">We are a Calgary technology and skills hub built on real IT expertise. Learn hands-on with specialized tools at our centre, or join the same training and mentorship online from anywhere.</p>
          <p className="mt-4 text-lg text-ink/70">Our goal is simple: give people and businesses the skills and data-driven know-how to stay competitive in a digital world.</p>
        </div>
        <Photo src={PHOTOS.team} alt="A team learning together" className="aspect-[4/3] rounded-[2rem] shadow-lift" />
      </section>

      <section className="section pb-16">
        {/* >>> EDIT HERE: ABOUT - THREE CARDS (Training / Consulting / Tools: edit the text in the list) <<< */}
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Training", "Future-focused programs for kids, teens and professionals.", "bg-brand-soft"],
            ["Consulting", "Data analytics and AI guidance for growing businesses.", "bg-sun-soft"],
            ["Tools", "Curated digital and learning tools you can use right away.", "bg-mint-soft"],
          ].map(([t, d, c]) => (
            <div key={t} className={`rounded-3xl p-8 ${c}`}>
              <h2 className="text-2xl font-bold">{t}</h2>
              <p className="mt-2 text-ink/70">{d}</p>
            </div>
          ))}
        </div>
        {/* >>> EDIT HERE: ABOUT - MISSION BOX <<< */}
        <div className="mt-10 panel p-8 sm:p-12">
          <h2 className="font-display text-3xl font-extrabold">Our <span className="mark">mission</span></h2>
          <p className="mt-4 max-w-3xl text-lg text-ink/70">To make technology accessible through future-focused training, curated learning tools and expert analytics consulting, so you can learn, innovate and lead with confidence.</p>
          <Link href="/contact" className="btn btn-primary mt-6">Book a free consultation</Link>
        </div>
      </section>
    </>
  );
}
