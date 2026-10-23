"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(
    params.get("error") ? { kind: "error", text: `Sign-in did not finish. ${params.get("reason") ?? ""}` } : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setMsg({ kind: "error", text: error.message });
      else if (data.session) { router.push(next); router.refresh(); }
      else setMsg({ kind: "info", text: "Account created. Check your email to confirm it, then sign in." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ kind: "error", text: error.message });
      else { router.push(next); router.refresh(); }
    }
    setBusy(false);
  }

  // ===== GOOGLE SIGN-IN (ON) =====
  async function google() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div className="panel w-full max-w-md p-8">
      <h1 className="font-display text-3xl font-extrabold">
        {mode === "in" ? <>Welcome <span className="mark">back</span></> : <>Create your <span className="mark">account</span></>}
      </h1>
      <p className="mt-2 text-ink/65">Your answers are saved to your account so you can come back to them.</p>

      {/* ===== GOOGLE BUTTON + DIVIDER (ON) ===== */}
      <button onClick={google} type="button" className="btn btn-ghost mt-6 w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-sm text-ink/45"><span className="h-px flex-1 bg-ink/10" />or use email<span className="h-px flex-1 bg-ink/10" /></div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold">Email
          <input className="input mt-1" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Password
          <input className="input mt-1" type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p role="alert" className={`rounded-xl p-3 text-sm ${msg.kind === "error" ? "bg-pink-soft text-pink" : "bg-mint-soft text-ink"}`}>{msg.text}</p>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}</button>
      </form>

      <p className="mt-5 text-center text-sm text-ink/65">
        {mode === "in" ? "New here?" : "Already have an account?"}{" "}
        <button type="button" className="font-bold text-brand underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}