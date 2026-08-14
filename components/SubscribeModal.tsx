"use client";
import { useEffect, useState } from "react";

const OPEN_EVENT = "ea:subscribe-open";

// Feature toggle — off by default, same convention as SubscribeRegister.
// Set NEXT_PUBLIC_SUBSCRIBE_ENABLED=true to turn subscribe UI back on.
export const SUBSCRIBE_ENABLED = process.env.NEXT_PUBLIC_SUBSCRIBE_ENABLED === "true";

export function openSubscribe() {
  if (!SUBSCRIBE_ENABLED) return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/** Reusable trigger — dispatches the open event picked up by <SubscribeModal>. */
export function SubscribeButton({ className, children }: { className?: string; children: React.ReactNode }) {
  if (!SUBSCRIBE_ENABLED) return null;
  return (
    <button type="button" onClick={() => openSubscribe()} className={className}>
      {children}
    </button>
  );
}

export default function SubscribeModal() {
  // Hook-free gate so the early return never sits above conditional hooks.
  if (!SUBSCRIBE_ENABLED) return null;
  return <SubscribeModalInner />;
}

function SubscribeModalInner() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    const onOpen = () => { setStatus("idle"); setOpen(true); };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "subscribe-modal" }),
      });
      setStatus(r.ok ? "done" : "error");
    } catch { setStatus("error"); }
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5"
    >
      <div className="relative w-full max-w-[400px] rounded-2xl border border-line bg-panel p-7 shadow-[var(--shadow)]">
        <button onClick={() => setOpen(false)} aria-label="Close"
          className="absolute right-4 top-4 flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-chip text-muted hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {status === "done" ? (
          <>
            <h3 className="font-display text-xl">You&apos;re in ✓</h3>
            <p className="mt-2 font-body text-sm text-muted">Check your inbox to confirm. One weekly value-signals email — free.</p>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl">Get the edge, every week</h3>
            <p className="mt-2 font-body text-sm text-muted">One weekly email: our biggest value signals and the full track record. Free.</p>
            <form onSubmit={submit} className="mt-4 flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" aria-label="Email"
                className="min-w-0 flex-1 rounded-[9px] border border-line bg-panel2 px-3 py-2.5 font-body text-sm text-ink placeholder:text-muted" />
              <button type="submit" disabled={status === "loading"}
                className="shrink-0 rounded-[9px] bg-accent px-4 py-2.5 font-body text-sm font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-60">
                {status === "loading" ? "…" : "Subscribe"}
              </button>
            </form>
            {status === "error" && <p className="mt-2 font-body text-xs text-loss">Something went wrong — please try again.</p>}
            <p className="mt-3 font-body text-[11px] text-muted">No spam. Unsubscribe anytime. 18+ · BeGambleAware.org</p>
          </>
        )}
      </div>
    </div>
  );
}
