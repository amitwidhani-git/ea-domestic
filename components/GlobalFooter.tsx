import Link from "next/link";

const PLATFORM_LINKS = [
  ["Home", "/"],
  ["Odds & value", "/insights"],
  ["Track Record", "/track-record"],
  ["Teams", "/teams"],
];

const RG_ORGS = [
  ["BeGambleAware", "https://www.begambleaware.org"],
  ["GamCare", "https://www.gamcare.org.uk"],
  ["GamStop", "https://www.gamstop.co.uk"],
];

export default function GlobalFooter() {
  return (
    <footer
      aria-label="Site footer"
      style={{ background: "#111111", borderTop: "1px solid rgba(247,245,240,0.05)" }}
    >
      {/* ── TOP GRID ─────────────────────────────────────────────────── */}
      <div className="gf-grid">

        {/* Col 1 — Brand */}
        <div className="gf-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <svg width="20" height="18" viewBox="1 -1 62 58" fill="none" aria-hidden="true">
              <path d="M4 22 L32 2 L60 22" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
              <path d="M4 38 L32 18 L60 38" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
              <path d="M4 54 L32 34 L60 54" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
            </svg>
            <span style={{
              fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
              fontSize: 16, letterSpacing: "0.1em",
              color: "rgba(247,245,240,0.85)", lineHeight: 1,
            }}>
              Edge Analysts
            </span>
          </div>

          <div style={{
            fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
            fontSize: 20, letterSpacing: "0.04em",
            color: "#12B886", lineHeight: 1, marginBottom: 14,
          }}>
            Beat the Game
          </div>

          <p style={{
            fontFamily: "var(--font-body,system-ui,sans-serif)",
            fontWeight: 200, fontSize: 11.5,
            color: "rgba(247,245,240,0.6)",
            maxWidth: 200, lineHeight: 1.65, marginBottom: 14,
          }}>
            Premier League and EFL football intelligence, powered by EdgeIQ, an AI assisted
            data model. Transparent, auditable track record. Every prediction logged before
            kick-off.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://www.instagram.com/edgeanalysts" target="_blank" rel="noopener noreferrer"
              aria-label="Edge Analysts on Instagram" className="gf-social">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a href="https://x.com/EdgeAnalysts" target="_blank" rel="noopener noreferrer"
              aria-label="Edge Analysts on X" className="gf-social">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Col 2 — Platform */}
        <nav aria-label="Platform links">
          <span className="gf-heading">Platform</span>
          {PLATFORM_LINKS.map(([label, href]) => (
            <Link key={label} href={href} className="gf-link">{label}</Link>
          ))}
        </nav>

        {/* Col 3 — About */}
        <nav aria-label="About links">
          <span className="gf-heading">About</span>
          <Link href="/about" className="gf-link">Who We Are</Link>
          <Link href="/about#what-is-edgeiq" className="gf-link">What is EdgeIQ</Link>
          <a href="mailto:contactus@edgeanalysts.com" className="gf-link">Contact</a>
          <Link href="/faqs" className="gf-link">FAQs</Link>
        </nav>

        {/* Col 4 — Legal */}
        <nav aria-label="Legal links">
          <span className="gf-heading">Legal</span>
          <p className="gf-link" style={{ cursor: "default", pointerEvents: "none", opacity: 0.6 }}>
            18+ · Gamble responsibly
          </p>
          <p className="gf-link" style={{ cursor: "default", pointerEvents: "none", opacity: 0.6 }}>
            Predictions for information only
          </p>
          <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="gf-link">
            BeGambleAware.org
          </a>
          <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="gf-link">
            GamCare.org.uk
          </a>
          <Link href="/cookies" className="gf-link">Cookie Policy</Link>
        </nav>
      </div>

      {/* ── RG / DISCLAIMER BAR ──────────────────────────────────────── */}
      <div
        role="region"
        aria-label="Responsible gambling information"
        className="gf-rg"
      >
        <p className="gf-rg-text">
          <span style={{ color: "#D96060", fontWeight: 600 }}>18+</span>
          {" · Gamble responsibly. Edge Analysts provides analytical information only and does not constitute betting advice. Odds are accurate at time of publication and subject to change. Edge Analysts earns commission when you sign up to an operator via our links. This does not affect the integrity of our analysis. Never bet more than you can afford to lose. "}
          {RG_ORGS.map(([label, href], i) => (
            <span key={label}>
              {i > 0 && " · "}
              <a href={href} target="_blank" rel="noopener noreferrer"
                style={{ color: "rgba(247,245,240,0.75)", textDecoration: "underline" }}>
                {label === "BeGambleAware" ? "BeGambleAware.org" : label === "GamCare" ? "GamCare.org.uk" : "GamStop.co.uk"}
              </a>
            </span>
          ))}
        </p>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {RG_ORGS.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              aria-label={`${label} (opens in new tab)`} className="gf-badge">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── LEGAL IDENTITY BAR ───────────────────────────────────────── */}
      <div className="gf-legal">
        <p className="gf-legal-text">
          © {new Date().getFullYear()} Edge Analysts Ltd · Company No. 17294865 · Registered in England and Wales
        </p>
        <p className="gf-legal-text">
          ICO Registration: Edge Analysts Ltd · Ref ZC180294
        </p>
      </div>

      <style>{`
        .gf-grid {
          display: grid;
          grid-template-columns: 1.3fr repeat(3, 1fr);
          gap: 60px;
          padding: 64px 56px 40px;
        }
        .gf-heading {
          font-family: var(--font-data, 'JetBrains Mono', monospace);
          font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(247,245,240,0.5); margin-bottom: 16px; display: block;
        }
        .gf-link {
          font-family: var(--font-body, system-ui, sans-serif);
          font-weight: 200; font-size: 12.5px;
          color: rgba(247,245,240,0.75); text-decoration: none;
          display: block; margin-bottom: 10px;
          transition: color 0.15s ease;
        }
        .gf-link:hover { color: rgba(247,245,240,0.95) !important; }
        .gf-social {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border: 1px solid rgba(247,245,240,0.15); border-radius: 4px;
          color: rgba(247,245,240,0.55); text-decoration: none;
          transition: all 0.15s;
        }
        .gf-social:hover { border-color: rgba(247,245,240,0.4) !important; color: #F7F5F0 !important; }
        .gf-rg {
          border-top: 1px solid rgba(247,245,240,0.05);
          padding: 18px 56px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .gf-rg-text {
          font-family: var(--font-body, system-ui, sans-serif);
          font-weight: 200; font-size: 10.5px;
          color: rgba(247,245,240,0.5); line-height: 1.7;
          max-width: 740px; margin: 0;
        }
        .gf-badge {
          font-family: var(--font-data, 'JetBrains Mono', monospace);
          font-size: 10.5px; letter-spacing: 0.04em;
          border: 1px solid rgba(247,245,240,0.15); border-radius: 2px;
          padding: 3px 7px; color: rgba(247,245,240,0.45);
          text-decoration: none; display: inline-block;
        }
        .gf-legal {
          border-top: 1px solid rgba(247,245,240,0.04);
          padding: 10px 56px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 8px;
        }
        .gf-legal-text {
          font-family: var(--font-body, system-ui, sans-serif);
          font-weight: 200; font-size: 9.5px;
          color: rgba(247,245,240,0.3); line-height: 1.6; margin: 0;
        }
        @media (max-width: 768px) {
          .gf-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            padding: 40px 20px 28px !important;
            gap: 24px 16px !important;
          }
          .gf-brand {
            grid-column: 1 / -1 !important;
            padding-bottom: 8px !important;
            border-bottom: 1px solid rgba(247,245,240,0.06) !important;
          }
          .gf-rg, .gf-legal { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </footer>
  );
}
