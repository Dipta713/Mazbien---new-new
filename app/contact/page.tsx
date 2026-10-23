// ================================================================
// CONTACT PAGE (app/contact/page.tsx). The email/address/socials live in lib/links.ts.
// The form itself is app/contact/ContactForm.tsx
// ================================================================
import ContactForm from "./ContactForm";
import { ADDRESS, CONTACT_EMAIL } from "@/lib/links";

export const metadata = { title: "Contact | Mazbien IntelliHub" };

export default function Contact() {
  return (
    <section className="section grid gap-10 py-16 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Let&apos;s start a <span className="pop">conversation</span></h1>
        <p className="mt-4 text-ink/70">Fill out the form and we will get back to you.</p>
        <ContactForm />
      </div>
      {/* >>> EDIT HERE: CONTACT - SIDE BOX (email + address, values come from lib/links.ts) <<< */}
      <aside className="h-fit rounded-3xl bg-brand-soft p-8">
        <h2 className="text-xl font-bold">General inquiries</h2>
        <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-brand-deep underline">{CONTACT_EMAIL}</a>
        <h2 className="mt-6 text-xl font-bold">Visit us</h2>
        <p className="mt-1 text-ink/70">{ADDRESS}</p>
      </aside>
    </section>
  );
}
