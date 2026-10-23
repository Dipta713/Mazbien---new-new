"use client";
import { useState } from "react";

export default function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand/40 via-pink/30 to-sun/40 ${className}`}>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
