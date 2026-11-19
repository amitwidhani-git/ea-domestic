"use client";
import { useEffect, useState, type ReactNode } from "react";
import { trackShare } from "@/lib/gtag";

/**
 * Newspaper-style share row for insight articles: X, LinkedIn, Facebook,
 * WhatsApp, email and copy-link, plus the device share sheet where the
 * browser supports it (mostly mobile). `url` must be absolute so the
 * shared link works off-site.
 */
export default function ArticleShare({ url, title, slug }: { url: string; title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => { setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);

  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const targets: { method: string; label: string; href: string; icon: ReactNode }[] = [
    { method: "x", label: "Share on X", href: `https://x.com/intent/post?text=${t}&url=${u}`, icon: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    ) },
    { method: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ) },
    { method: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: (
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    ) },
    { method: "whatsapp", label: "Share on WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, icon: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    ) },
    { method: "email", label: "Share by email", href: `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`, icon: (
      <path d="M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.511l10 6.25 10-6.25V6H2zm20 2.869-9.47 5.918a1 1 0 0 1-1.06 0L2 8.869V18h20V8.869z" />
    ) },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare({ method: "copy_link", slug });
    } catch { /* clipboard blocked: nothing useful to fall back to */ }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
      trackShare({ method: "native", slug });
    } catch { /* user dismissed the share sheet */ }
  }

  const btn = "flex h-8 w-8 items-center justify-center rounded border border-line text-muted transition-colors hover:border-ink hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article">
      <span className="mr-1 font-data text-[10px] uppercase tracking-widest text-muted">Share</span>
      {targets.map((s) => (
        <a key={s.method} href={s.href} target={s.method === "email" ? undefined : "_blank"} rel="noopener noreferrer"
          aria-label={s.label} title={s.label} className={btn} onClick={() => trackShare({ method: s.method, slug })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{s.icon}</svg>
        </a>
      ))}
      <button type="button" onClick={copyLink} aria-label="Copy link" title="Copy link" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} aria-label="More sharing options" title="More options" className={btn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      )}
      <span role="status" aria-live="polite" className="font-data text-[10px] text-accent">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
