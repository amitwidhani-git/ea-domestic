import type { Metadata } from "next";
import NavLogo from "@/components/NavLogo";
import NavTabs from "@/components/NavTabs";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import SubscribeModal, { SubscribeButton } from "@/components/SubscribeModal";
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
    <html lang="en-GB" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
            <div className="ml-auto flex items-center gap-2.5">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <SubscribeButton className="rounded-[9px] bg-accent px-4 py-2 font-body text-[13px] font-bold text-accent-fg transition-[filter] hover:brightness-105">
                Subscribe
              </SubscribeButton>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pb-8">
          {children}
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <GlobalFooter />

        <SubscribeModal />
        <CookieConsentBanner />

      </body>
    </html>
  );
}
