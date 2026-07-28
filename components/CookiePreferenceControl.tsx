"use client";
import { useEffect, useState } from "react";
import { getConsent, setConsent, type ConsentChoice } from "@/lib/consent";

export default function CookiePreferenceControl() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChoice(getConsent());
    setMounted(true);
  }, []);

  const decide = (next: ConsentChoice) => {
    setConsent(next);
    setChoice(next);
  };

  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-data text-[10px] uppercase tracking-widest text-ink">
        Current preference
      </p>
      <p className="mt-1 font-display text-lg tracking-wide text-accent">
        {!mounted ? "…" : choice === "accepted" ? "Accepted" : choice === "declined" ? "Declined" : "Not yet set"}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => decide("declined")}
          className="border border-line px-4 py-2 font-data text-[11px] uppercase tracking-widest text-ink transition-colors hover:border-muted"
        >
          Decline non-essential
        </button>
        <button
          onClick={() => decide("accepted")}
          className="border border-accent bg-accent/10 px-4 py-2 font-data text-[11px] uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
        >
          Accept non-essential
        </button>
      </div>
    </div>
  );
}
