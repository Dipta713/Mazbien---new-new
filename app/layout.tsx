import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSessionInfo } from "@/lib/supabase/server";

// >>> EDIT HERE: SITE TITLE + DESCRIPTION (browser tab / Google) <<<
export const metadata: Metadata = {
  title: "Mazbien IntelliHub | AI training that fits your team",
  description: "Practical AI and tech training for kids, teens, professionals and businesses. Take the 5-minute AI Training Needs Assessment.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isConsultant } = await getSessionInfo();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
        <Navbar email={user?.email ?? null} isConsultant={isConsultant} />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
