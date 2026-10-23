import Link from "next/link";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import Logo from "./Logo";
import { ADDRESS, CONTACT_EMAIL, FACEBOOK_URL, INSTAGRAM_URL, LINKEDIN_URL, MAIN_SITE } from "@/lib/links";

export default function Footer() {
  const social = "grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-sun hover:text-ink";
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="section grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          {/* >>> EDIT HERE: FOOTER - ABOUT BLURB <<< */}
          <p className="mt-4 max-w-sm text-white/70">Practical AI and tech training for kids, teens, professionals and growing businesses. Online or at our Calgary centre.</p>
          <p className="mt-4 text-sm text-white/60">{ADDRESS}<br />{CONTACT_EMAIL}</p>
        </div>
        <div>
          {/* >>> EDIT HERE: FOOTER - COMPANY LINKS <<< */}
          <h3 className="font-display text-lg font-bold">Company</h3>
          <ul className="mt-4 space-y-2 text-white/75">
            <li><Link href="/" className="hover:text-sun">Home</Link></li>
            <li><Link href="/about" className="hover:text-sun">About</Link></li>
            <li><Link href="/programs" className="hover:text-sun">Programs</Link></li>
            <li><Link href="/programs#tech-camp" className="hover:text-sun">Tech Camp</Link></li>
            <li><Link href="/shop" className="hover:text-sun">Shop</Link></li>
            <li><Link href="/contact" className="hover:text-sun">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Connect</h3>
          <div className="mt-4 flex gap-3">
            <a className={social} href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={20} /></a>
            <a className={social} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={20} /></a>
            <a className={social} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="section flex flex-col justify-between gap-3 py-6 text-sm text-white/55 sm:flex-row">
          {/* >>> EDIT HERE: FOOTER - COPYRIGHT LINE <<< */}
          <p>© 2026 Mazbien IntelliHub Inc. Student prototype for ENTR 3360.</p>
          <div className="flex gap-5">
            <a href={`${MAIN_SITE}/privacy-policy/`} className="hover:text-white">Privacy Policy</a>
            <a href={`${MAIN_SITE}/terms-of-service/`} className="hover:text-white">Terms of Service</a>
            <a href={`${MAIN_SITE}/accessibility-statement/`} className="hover:text-white">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
