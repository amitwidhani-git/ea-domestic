import type { Metadata } from "next";
import NavTabs from "@/components/NavTabs";
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
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-bg antialiased">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5">
            <div>
              <p className="font-display text-3xl leading-none tracking-wide">
                EDGE<span className="text-accent">ANALYSTS</span>
              </p>
              <p className="mt-1 font-data text-[10px] uppercase tracking-[0.2em] text-muted">
                Locked before kick-off · Never revised
              </p>
            </div>
            <NavTabs />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-6 font-data text-[11px] text-muted">
            Model output is information, not betting advice. 18+ · begambleaware.org ·
            Some links are affiliate links (marked Ad) — we may earn commission if you sign up, at no cost to you.
          </p>
        </footer>
      </body>
    </html>
  );
}
