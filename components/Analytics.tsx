"use client";
import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { hasAnalyticsConsent, CONSENT_EVENT } from "@/lib/consent";

export default function Analytics() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setConsent(hasAnalyticsConsent());
    const handler = () => setConsent(hasAnalyticsConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!consent || !gaId) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
