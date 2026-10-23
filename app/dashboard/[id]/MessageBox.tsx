"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; sender_role: string; body: string; created_at: string };

export default function MessageBox({ assessmentId, initial }: { assessmentId: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in again."); setSending(false); return; }

    const { data, error } = await supabase
      .from("assessment_messages")
      .insert({ assessment_id: assessmentId, sender_id: user.id, sender_role: "client", body })
      .select("id, sender_role, body, created_at")
      .single();

    if (error) setError("Couldn't send. Try again.");
    else { setMessages((m) => [...m, data]); setText(""); }
    setSending(false);
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Messages</h2>
      <div className="mt-3 flex flex-col gap-2">
        {messages.length === 0 && <p className="text-ink/60">No messages yet.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2 ${
              m.sender_role === "client" ? "self-end bg-brand-soft" : "self-start bg-white ring-1 ring-ink/5"
            }`}
          >
            <p>{m.body}</p>
            <p className="mt-1 text-xs text-ink/50">{new Date(m.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Write a message to your consultant..."
        className="mt-4 w-full rounded-xl border border-ink/10 p-3"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <button onClick={send} disabled={sending} className="btn btn-primary mt-2">
        {sending ? "Sending..." : "Send message"}
      </button>
    </section>
  );
}