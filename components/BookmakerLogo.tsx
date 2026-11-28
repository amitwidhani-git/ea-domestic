import type { CtaAffiliate } from "@/lib/affiliates";

// Partner logomarks taken from each brand's own logo file: Betano's "B", Grosvenor's
// "G" emblem, and Betway's "bw" / LiveScoreBet's "LSB" cut from their wordmarks
// (public/*-mark.png), each on the background colour the logo is drawn for.
const MARKS: Record<string, { src: string; bg: string; img: string; box: string }> = {
  betano: { src: "/betano-mark.png", bg: "#ffffff", img: "h-full w-full", box: "w-5 p-[3px]" },
  grosvenor: { src: "/grosvenor-logo.png", bg: "#000000", img: "h-full w-full", box: "w-5 p-[2px]" },
  betway: { src: "/betway-mark.png", bg: "#000000", img: "h-[9px] w-auto", box: "px-[4px]" },
  livescorebet: { src: "/livescorebet-mark.png", bg: "#000000", img: "h-[9px] w-auto", box: "px-[4px]" },
};

/**
 * Small bookmaker badge so a price's source (or a CTA's real destination) is
 * always clear. Partners with a logomark show it; other partners use their
 * brand-colour initials chip; bookmakers without a partner record fall back
 * to neutral text initials.
 */
export default function BookmakerLogo({ cta, name }: { cta?: CtaAffiliate | null; name: string }) {
  const mark = cta ? MARKS[cta.affiliateId?.toLowerCase()] : undefined;
  if (mark) {
    return (
      <span className={`flex h-5 shrink-0 items-center justify-center rounded ring-1 ring-white/10 ${mark.box}`} style={{ background: mark.bg }} title={name}>
        <img src={mark.src} alt="" className={`object-contain ${mark.img}`} />
      </span>
    );
  }
  const initials = cta?.logoInitials ?? name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-data text-[9px] font-bold leading-none ${cta ? "" : "bg-chip text-muted"}`}
      style={cta ? { background: cta.brandColor ?? "#ffffff", color: "#0E1521" } : undefined}
      title={name}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
