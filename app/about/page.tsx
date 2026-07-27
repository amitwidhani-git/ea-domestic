import about from "@/data/about.json";
import edgeiq from "@/data/edgeiq.json";

const edgeiqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: edgeiq.questions.map((q) => ({
    "@type": "Question",
    name: q.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: [...q.paragraphs, ...(q.list ?? [])].join(" "),
    },
  })),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@type": "Organization",
    name: "Edge Analysts",
    legalName: "Edge Analysts Ltd",
    description:
      "Edge Analysts is a UK football intelligence platform built around EdgeIQ, a proprietary AI-assisted prediction model. Every prediction is logged and timestamped before kick-off, creating a permanent, publicly checkable track record.",
    sameAs: [
      "https://www.instagram.com/edgeanalysts",
      "https://x.com/EdgeAnalysts",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contactus@edgeanalysts.com",
      contactType: "customer support",
    },
    identifier: [
      {
        "@type": "PropertyValue",
        name: "Companies House Number",
        value: "17294865",
      },
      {
        "@type": "PropertyValue",
        name: "ICO Registration",
        value: "ZC180294",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(edgeiqJsonLd) }}
      />

      <section>
        <h1 className="font-display text-4xl tracking-wide">Who We Are</h1>
        <p className="mt-4 max-w-2xl font-display text-2xl leading-snug tracking-wide text-ink">
          {about.lead}
        </p>
        <div className="mt-4 max-w-2xl space-y-4">
          {about.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-ink">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="what-is-edgeiq">
        <h2 className="mb-4 font-display text-2xl tracking-wide">{edgeiq.heading}</h2>
        <div className="max-w-2xl space-y-6">
          {edgeiq.questions.map((q) => (
            <div key={q.question}>
              {q.question !== edgeiq.heading && (
                <h3 className="font-display text-xl tracking-wide text-ink">{q.question}</h3>
              )}
              <div className="mt-2 space-y-2">
                {q.paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink">
                    {paragraph}
                  </p>
                ))}
                {q.list?.map((item, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="font-display text-2xl tracking-wide text-ink">
          {about.closing}
        </p>
      </section>

      <p className="font-data text-[10px] text-ink">
        {about.disclaimer}
      </p>
    </div>
  );
}
