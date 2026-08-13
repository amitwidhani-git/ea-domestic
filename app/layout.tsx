import type { Metadata } from "next";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";
import NavTabs from "@/components/NavTabs";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalFooter from "@/components/GlobalFooter";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://edgeanalysts.com"),
  title: "Edge Analysts | Football Predictions & Odds Comparison",
  description: "Data-driven, AI-assisted football predictions for the Premier League and EFL. Compared against bookmaker odds, logged before kick-off, never revised.",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('ea-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-bg antialiased">

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-line bg-panel">
          <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-4 px-4 sm:gap-5 sm:px-6">
            <MobileNav />
            <NavLogo />
            <div className="hidden sm:block">
              <NavTabs />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/track-record"
                className="hidden items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 font-data text-xs text-accent-ink transition-colors hover:bg-accent/15 sm:inline-flex"
              >
                Every pick logged pre-KO
              </Link>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pb-8">
          {children}
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <GlobalFooter />

        <CookieConsentBanner />

      </body>
    </html>
  );
}
