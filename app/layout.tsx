import type { Metadata } from "next";
import NavLogo from "@/components/NavLogo";
import NavTabs from "@/components/NavTabs";
import GlobalFooter from "@/components/GlobalFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Edge Analysts — UK Football Intelligence",
  description: "Model-driven predictions for the Premier League, Championship, League One and League Two. Every prediction frozen before kick-off, never revised.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@200;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-bg antialiased" style={{ background: "#080808" }}>

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50" style={{ background: "#111111", borderBottom: "1px solid rgba(247,245,240,0.07)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <NavLogo />
            <NavTabs />
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <GlobalFooter />

      </body>
    </html>
  );
}
