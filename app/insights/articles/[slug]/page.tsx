import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getArticleBySlug } from "@/lib/data";
import { decodeParam } from "@/lib/decodeParam";
import ArticleShare from "@/components/ArticleShare";

export const dynamic = "force-dynamic";

// Only same-site paths or https URLs are allowed as article link targets.
const isSafeHref = (h: string) => (h.startsWith("/") && !h.startsWith("//")) || h.startsWith("https://");

/** Wraps each occurrence of an article's link phrases in a link; the stored paragraph stays plain text. */
function linkify(text: string, links: { text: string; href: string }[]): ReactNode {
  const usable = links.filter((l) => l.text && isSafeHref(l.href));
  if (usable.length === 0) return text;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${usable.map((l) => escape(l.text)).join("|")})`, "g");
  return text.split(re).map((part, i) => {
    const link = usable.find((l) => l.text === part);
    if (!link) return part;
    return link.href.startsWith("/")
      ? <Link key={i} href={link.href} className="text-accent underline hover:no-underline">{part}</Link>
      : <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">{part}</a>;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(decodeParam(slug));
  if (!article) return {};

  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/insights/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      url: `/insights/articles/${article.slug}`,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at ?? article.published_at,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeParam(rawSlug);
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edgeanalysts.com";
  const shareUrl = `${site}/insights/articles/${article.slug}`;

  const questionSections =article.sections.filter((s) => s.heading?.trim().endsWith("?"));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.published_at,
    dateModified: article.updated_at ?? article.published_at,
    author: { "@type": "Organization", name: article.author ?? "Edge Analysts" },
    publisher: { "@type": "Organization", name: "Edge Analysts" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `/insights/articles/${article.slug}` },
  };

  const faqJsonLd = questionSections.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questionSections.map((s) => ({
      "@type": "Question",
      name: s.heading,
      acceptedAnswer: { "@type": "Answer", text: s.paragraphs.join(" ") },
    })),
  } : null;

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <Link href="/insights#top-stories" className="font-data text-xs text-accent hover:underline">
        ← Top Stories
      </Link>

      <article className="max-w-2xl space-y-6">
        <header>
          <h1 className="font-display text-4xl tracking-wide">{article.title}</h1>
          {article.dek && (
            <p className="mt-3 font-display text-xl leading-snug tracking-wide text-ink">{article.dek}</p>
          )}
          <p className="mt-3 font-data text-[11px] uppercase tracking-widest text-ink">
            Published: {fmt(article.published_at)}
            {article.updated_at && article.updated_at !== article.published_at && (
              <> · Last updated: {fmt(article.updated_at)}</>
            )}
            {" · "}{article.author ?? "Edge Analysts"}
          </p>
          <div className="mt-4 border-y border-line py-3">
            <ArticleShare url={shareUrl} title={article.title} slug={article.slug} />
          </div>
        </header>

        <div className="space-y-6">
          {article.sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h2 className="font-display text-xl tracking-wide text-ink">{s.heading}</h2>
              )}
              <div className={s.heading ? "mt-2 space-y-3" : "space-y-3"}>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed text-ink">{linkify(p, article.links ?? [])}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {article.linkedin_url && /^https:\/\/(www\.)?linkedin\.com\//.test(article.linkedin_url) && (
          <a href={article.linkedin_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Follow {article.author ?? "Edge Analysts"} on LinkedIn
          </a>
        )}

        <div className="border-t border-line pt-4">
          <ArticleShare url={shareUrl} title={article.title} slug={article.slug} />
        </div>

        {article.disclaimer && (
          <p className="border-t border-line pt-4 font-data text-[10px] leading-relaxed text-ink">
            {article.disclaimer}
          </p>
        )}

        <p className="font-data text-[9px] uppercase tracking-widest text-ink">
          Model probability only · Not a betting recommendation
        </p>
        <p className="font-data text-[9px] text-ink">18+ · BeGambleAware.org</p>
      </article>
    </div>
  );
}
