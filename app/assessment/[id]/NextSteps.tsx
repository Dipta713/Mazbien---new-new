"use client";
// Shown on the "Sent to a consultant" screen: 1) deposit (Stripe), 2) book a meeting (Google Calendar + Google Maps).
// Meeting times stay locked until the deposit is paid.
import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, Lock, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ApiError = { service: string; code: string; userMessage: string };
type Booking = { startsAt: string; meetLink: string | null; type: "video" | "in_person" };
type Trip = { minutes: number; km: number };

const TZ = "America/Edmonton";
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-CA", { timeZone: TZ, ...opts });
const dayLabel = (iso: string) => fmt(iso, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in Calgary
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(url, init);
    const json = await res.json();
    if (!res.ok || json.ok === false) return { ok: false, error: json.error ?? { service: "app", code: "unknown", userMessage: "Something went wrong." } };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: { service: "network", code: "network", userMessage: "We could not reach the server. Check your connection and try again." } };
  }
}

export default function NextSteps({ assessmentId }: { assessmentId: string }) {
  const supabase = createClient();
  // deposit
  const [deposit, setDeposit] = useState<"none" | "demo" | "paid">("none");
  const [depositLoaded, setDepositLoaded] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [depositErr, setDepositErr] = useState<ApiError | null>(null);
  const [depositBusy, setDepositBusy] = useState(false);
  // meeting
  const [type, setType] = useState<"video" | "in_person">("video");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsErr, setSlotsErr] = useState<ApiError | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookErr, setBookErr] = useState<ApiError | null>(null);
  const [bookBusy, setBookBusy] = useState(false);
  // maps
  const [address, setAddress] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripErr, setTripErr] = useState<ApiError | null>(null);
  const [tripBusy, setTripBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await supabase.from("assessment_package_choices").select("deposit_status").eq("assessment_id", assessmentId).maybeSingle();
      if (c.data?.deposit_status && c.data.deposit_status !== "none") setDeposit(c.data.deposit_status as "none" | "demo" | "paid");
      const b = await supabase.from("consultations").select("starts_at,meet_link,meeting_type").eq("assessment_id", assessmentId).maybeSingle();
      if (b.data) setBooking({ startsAt: b.data.starts_at, meetLink: b.data.meet_link, type: b.data.meeting_type });
      setDepositLoaded(true);
    })();
    // Back from Stripe: confirm the payment, then clean the address bar
    const q = new URLSearchParams(window.location.search);
    if (q.get("deposit") === "success" && q.get("session_id")) {
      confirmDeposit(q.get("session_id")!);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  // Only ask for the consultant's open times once the deposit is paid.
  useEffect(() => {
    if (deposit !== "none" && !booking && slots === null) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposit, booking]);

  async function loadSlots() {
    setSlotsErr(null);
    const r = await call<{ slots: string[] }>(`/api/calendar/slots?assessmentId=${encodeURIComponent(assessmentId)}`);
    if (r.ok) setSlots(r.data.slots); else { setSlots([]); setSlotsErr(r.error); }
  }

  async function startDeposit() {
    setDepositBusy(true); setDepositErr(null);
    const r = await call<{ mode: "demo" | "live"; url?: string }>("/api/stripe/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId }) });
    setDepositBusy(false);
    if (!r.ok) return setDepositErr(r.error);
    if (r.data.mode === "live" && r.data.url) window.location.href = r.data.url;
    else setDemoOpen(true);
  }
  async function confirmDeposit(sessionId?: string) {
    const r = await call<{ status: "paid" | "demo"; emailSent: boolean | null }>("/api/stripe/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId, sessionId }) });
    if (!r.ok) return setDepositErr(r.error);
    setDeposit(r.data.status); setEmailSent(r.data.emailSent); setDemoOpen(false); setDepositLoaded(true);
  }

  async function checkTrip() {
    setTripBusy(true); setTripErr(null); setTrip(null);
    const r = await call<Trip>("/api/directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: address }) });
    setTripBusy(false);
    if (r.ok) setTrip(r.data); else setTripErr(r.error);
  }

  async function book() {
    if (!picked) return;
    setBookBusy(true); setBookErr(null);
    const r = await call<{ startsAt: string; meetLink: string | null }>("/api/calendar/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId, startISO: picked, type, address: type === "in_person" ? address : undefined }) });
    setBookBusy(false);
    if (r.ok) setBooking({ startsAt: r.data.startsAt, meetLink: r.data.meetLink, type });
    else { setBookErr(r.error); if (r.error.code === "slot_taken") { setPicked(null); loadSlots(); } }
  }

  // ---- calendar: the next 14 days, Monday first, weekends greyed out ----
  const slotsByDay = (slots ?? []).reduce<Record<string, string[]>>((acc, s) => { (acc[dayKey(s)] ||= []).push(s); return acc; }, {});
  const [ty, tm, td] = dayKey(new Date().toISOString()).split("-").map(Number);
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(ty, tm - 1, td + 1 + i)));
  const lead = (days[0].getUTCDay() + 6) % 7; // empty cells so the first day lands under the right weekday
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...days];
  const rangeLabel = `${days[0].toLocaleDateString("en-CA", { timeZone: "UTC", month: "short", day: "numeric" })} to ${days[13].toLocaleDateString("en-CA", { timeZone: "UTC", month: "short", day: "numeric" })}`;
  const officeLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(address || "")}&destination=${encodeURIComponent("Calgary, AB")}&travelmode=transit`;
  const unlocked = deposit !== "none";

  return (
    <div className="mt-10 space-y-6 text-left">
      {/* ===== 1. DEPOSIT (Stripe) ===== */}
      <section className="panel p-6">
        <div className="flex items-center gap-3"><CreditCard className="text-brand" /><h2 className="font-display text-2xl font-extrabold">Step 1: Hold your consultation with a deposit</h2></div>
        <p className="mt-2 text-ink/70">A <b>$100 deposit</b> unlocks meeting times with your consultant. It counts toward your total once we start working together.</p>
        {deposit !== "none" ? (
          <p className="mt-4 rounded-xl bg-mint-soft p-3 text-sm font-semibold">
            ✓ Deposit received{deposit === "demo" ? " (demo mode, no card was charged)" : ""}.
            {emailSent === true ? " We emailed you the receipt and your total." : emailSent === false ? " We could not send the email, but your receipt is on your dashboard." : " Your receipt is on your dashboard."}
          </p>
        ) : demoOpen ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft p-5">
            <p className="font-bold">Demo checkout (Stripe is not connected yet)</p>
            <p className="mt-1 text-sm text-ink/70">With a real Stripe key, you would be sent to Stripe's secure card page here. Nothing is charged in demo mode.</p>
            <div className="mt-3 flex gap-3">
              <button type="button" className="btn btn-primary" onClick={() => confirmDeposit()}>Pay $100 (demo)</button>
              <button type="button" className="btn btn-ghost" onClick={() => setDemoOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary mt-4" disabled={depositBusy || !depositLoaded} onClick={startDeposit}>{depositBusy ? "One moment…" : "Pay $100 deposit"}</button>
        )}
        {depositErr && (
          <div role="alert" className="mt-4 rounded-xl bg-pink-soft p-3 text-sm text-pink">
            <p className="font-semibold">{depositErr.userMessage}</p>
            <p className="mt-1 text-ink/70">Nothing was charged. You can{" "}
              <Link className="font-bold underline" href={`/dashboard/${assessmentId}`}>message the consultant</Link> and they can send an invoice instead.</p>
          </div>
        )}
      </section>

      {/* ===== 2. MEETING (Google Calendar + Google Maps) ===== */}
      <section className="panel p-6">
        <div className="flex items-center gap-3"><CalendarDays className="text-brand" /><h2 className="font-display text-2xl font-extrabold">Step 2: Pick a time to meet</h2></div>

        {booking ? (
          <div className="mt-4 rounded-2xl bg-mint-soft p-5">
            <p className="font-bold">You are booked ✓</p>
            <p className="mt-1">{dayLabel(booking.startsAt)} at {timeLabel(booking.startsAt)} (Calgary time)</p>
            {booking.type === "video" && booking.meetLink && <p className="mt-2"><a className="font-bold text-brand underline" href={booking.meetLink} target="_blank" rel="noreferrer">Open the Google Meet link</a></p>}
            <p className="mt-2 text-sm text-ink/65">We emailed you the details and a Google Calendar invite. You can also see this meeting on <Link className="font-bold underline" href={`/dashboard/${assessmentId}`}>your page</Link>.</p>
          </div>
        ) : !depositLoaded ? (
          <p className="mt-4 text-sm text-ink/60">Loading…</p>
        ) : !unlocked ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 bg-ink/5 p-5 text-ink/60">
            <Lock size={20} className="shrink-0" />
            <p className="font-semibold">Pay the $100 deposit in Step 1 to unlock meeting times.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-3">
              {([["video", "Video call", Video], ["in_person", "In person", MapPin]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 font-bold transition ${type === k ? "border-brand bg-brand-soft" : "border-ink/10 bg-white hover:border-brand/40"}`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>

            {type === "in_person" && (
              <div className="mt-5">
                <label className="block text-sm font-semibold">Where are you starting from?
                  <input className="input mt-1" placeholder="Your address, e.g. 123 4 Ave SW, Calgary" value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <button type="button" className="btn btn-ghost mt-3" disabled={!address.trim() || tripBusy} onClick={checkTrip}>{tripBusy ? "Checking…" : "How far is it? Can I take the bus?"}</button>
                {trip && (
                  <div className="mt-3 rounded-xl bg-white p-4 shadow-tile">
                    <p className="font-bold">About {trip.minutes} min by transit ({trip.km} km)</p>
                    <p className="text-sm text-ink/70">This is an estimate. <a className="font-bold text-brand underline" href={officeLink} target="_blank" rel="noreferrer">See bus times in Google Maps</a></p>
                  </div>
                )}
                {tripErr && (
                  <div role="alert" className="mt-3 rounded-xl bg-pink-soft p-3 text-sm text-pink">
                    <p className="font-semibold">{tripErr.userMessage}</p>
                    <a className="mt-1 inline-block font-bold underline" href={officeLink} target="_blank" rel="noreferrer">Open this route in Google Maps</a>
                  </div>
                )}
              </div>
            )}

            <h3 className="mt-6 font-bold">Pick a day <span className="font-normal text-ink/50">({rangeLabel}, Calgary time)</span></h3>
            {slots === null && <p className="mt-2 text-sm text-ink/60">Loading the consultant's calendar…</p>}
            {slotsErr && (
              <div role="alert" className="mt-2 rounded-xl bg-pink-soft p-3 text-sm text-pink">
                <p className="font-semibold">{slotsErr.userMessage}</p>
                <div className="mt-2 flex gap-4 font-bold">
                  <button type="button" className="underline" onClick={loadSlots}>Try again</button>
                  <Link className="underline" href={`/dashboard/${assessmentId}`}>Message the consultant</Link>
                </div>
              </div>
            )}

            {slots !== null && !slotsErr && (
              <div className="mt-3 max-w-md">
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-ink/50">
                  {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {cells.map((d, i) => {
                    if (!d) return <div key={`e${i}`} />;
                    const key = d.toISOString().slice(0, 10);
                    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                    const open = (slotsByDay[key]?.length ?? 0) > 0;
                    const sel = pickedDay === key;
                    return (
                      <button key={key} type="button" disabled={!open} aria-pressed={sel}
                        onClick={() => { setPickedDay(key); setPicked(null); }}
                        title={weekend ? "Closed on weekends" : open ? "Open times" : "No open times"}
                        className={`aspect-square rounded-xl border-2 text-sm font-bold transition ${sel ? "border-brand bg-brand text-white" : open ? "border-ink/10 bg-white hover:border-brand/40" : weekend ? "border-transparent bg-ink/5 text-ink/25" : "border-transparent bg-ink/5 text-ink/30 line-through"}`}>
                        {d.getUTCDate()}
                      </button>
                    );
                  })}
                </div>
                {Object.keys(slotsByDay).length === 0 && <p className="mt-3 text-sm text-ink/60">No open times in the next two weeks. Message the consultant to arrange one.</p>}
              </div>
            )}

            {pickedDay && slotsByDay[pickedDay] && (
              <div className="mt-5">
                <p className="text-sm font-bold text-ink/60">Open times on {dayLabel(slotsByDay[pickedDay][0])}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slotsByDay[pickedDay].map((s) => (
                    <button key={s} type="button" aria-pressed={picked === s} onClick={() => setPicked(s)}
                      className={`rounded-full border-2 px-3 py-1 text-sm font-bold transition ${picked === s ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand/40"}`}>{timeLabel(s)}</button>
                  ))}
                </div>
              </div>
            )}

            {bookErr && <p role="alert" className="mt-4 rounded-xl bg-pink-soft p-3 text-sm font-semibold text-pink">{bookErr.userMessage}</p>}
            <button type="button" className="btn btn-primary mt-5" disabled={!picked || bookBusy || (type === "in_person" && !address.trim())} onClick={book}>
              {bookBusy ? "Booking…" : picked ? `Book ${dayLabel(picked)} at ${timeLabel(picked)}` : pickedDay ? "Pick a time" : "Pick a day"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
