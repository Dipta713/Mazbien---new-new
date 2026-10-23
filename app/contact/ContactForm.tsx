"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ContactForm() {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().from("contact_messages").insert({
      first_name: f.get("first_name"), last_name: f.get("last_name"), email: f.get("email"),
      phone: f.get("phone") || null, message: f.get("message"),
    });
    setBusy(false);
    if (error) setErr("We could not send that. Please try again or email us directly.");
    else setDone(true);
  }

  if (done) return <p className="mt-8 rounded-2xl bg-mint-soft p-6 font-semibold">Thanks, your message is in. We will reply soon.</p>;

  return (
    <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">First name<input name="first_name" required className="input mt-1" /></label>
      <label className="text-sm font-semibold">Last name<input name="last_name" required className="input mt-1" /></label>
      <label className="text-sm font-semibold">Email<input name="email" type="email" required className="input mt-1" /></label>
      <label className="text-sm font-semibold">Phone number<input name="phone" type="tel" className="input mt-1" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Message<textarea name="message" required rows={5} className="input mt-1" /></label>
      {err && <p role="alert" className="text-sm text-pink sm:col-span-2">{err}</p>}
      <button disabled={busy} className="btn btn-primary sm:col-span-2 sm:w-fit">{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}
