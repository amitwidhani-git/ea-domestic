import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: `${article.title} | Edge Analysts`,
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
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const questionSections = article.sections.filter((s) => s.heading?.trim().endsWith("?"));

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
        </header>

        <div className="space-y-6">
          {article.sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h2 className="font-display text-xl tracking-wide text-ink">{s.heading}</h2>
              )}
              <div className={s.heading ? "mt-2 space-y-3" : "space-y-3"}>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed text-ink">{p}</p>
                ))}
              </div>
            </div>
          ))}
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
