"use client";
import { useState } from "react";

export default function AiSummary({ assessmentId, initial }: { assessmentId: string; initial: string | null }) {
  const [summary, setSummary] = useState<string | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function write() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) setError(json?.error?.userMessage ?? "AI summary is not available right now. Your answers are still saved.");
      else setSummary(json.summary);
    } catch {
      setError("AI summary is not available right now. Your answers are still saved.");
    }
    setLoading(false);
  }

  return (
    <section className="mb-10 rounded-2xl bg-white p-6 ring-1 ring-ink/5">
      <h2 className="text-xl font-bold">Your summary</h2>
      {summary ? (
        <p className="mt-3 whitespace-pre-line">{summary}</p>
      ) : (
        <p className="mt-1 text-ink/60">Want a short plain-language summary of your answers? We can write one for you.</p>
      )}
      {summary && <p className="mt-2 text-xs text-ink/50">Written by AI from your answers. A Mazbien consultant reviews everything before it is final.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={write} disabled={loading} className="btn btn-primary mt-4">
        {loading ? "Writing..." : summary ? "Write it again" : "Write my summary with AI"}
      </button>
    </section>
  );
}
