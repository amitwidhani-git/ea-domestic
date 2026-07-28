"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent, type ConsentChoice } from "@/lib/consent";

export default function CookieConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChoice(getConsent());
    setMounted(true);
  }, []);

  if (!mounted || choice !== null) return null;

  const decide = (next: ConsentChoice) => {
    setConsent(next);
    setChoice(next);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-line bg-panel"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl font-body text-xs leading-relaxed text-ink">
          We use essential cookies to run this site, and would like to use additional cookies to
          understand traffic and improve the service. See our{" "}
          <Link href="/cookies" className="underline hover:text-accent">Cookie Policy</Link> for
          details. You can change your choice at any time.
        </p>
        <div className="flex flex-shrink-0 gap-2 self-start sm:self-center">
          <button
            onClick={() => decide("declined")}
            className="border border-line px-4 py-2 font-data text-[11px] uppercase tracking-widest text-ink transition-colors hover:border-muted"
          >
            Decline
          </button>
          <button
            onClick={() => decide("accepted")}
            className="border border-accent bg-accent/10 px-4 py-2 font-data text-[11px] uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
