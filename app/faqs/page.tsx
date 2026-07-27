import faqs from "@/data/faqs.json";

export default function FAQsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.categories.flatMap((cat) =>
      cat.questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.answer },
      }))
    ),
  };

  const questionById = new Map(
    faqs.categories.flatMap((cat) => cat.questions.map((q) => [q.id, q] as const))
  );

  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section>
        <h1 className="font-display text-4xl tracking-wide">FAQs</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Answers to common questions about Edge Analysts, our AI football prediction model
          EdgeIQ, how we handle compliance, and how our Value Signals work.
        </p>
      </section>

      {faqs.categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-4 font-display text-2xl tracking-wide">{cat.title}</h2>
          <div className="space-y-6">
            {cat.questions.map((q) => (
              <div key={q.id} id={q.id} className="border-t border-line pt-4">
                <h3 className="font-display text-xl tracking-wide">{q.question}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">{q.answer}</p>
                {q.related.length > 0 && (
                  <p className="mt-2 font-data text-[10px] text-ink">
                    Related:{" "}
                    {q.related.map((relatedId, i) => {
                      const relatedQ = questionById.get(relatedId);
                      if (!relatedQ) return null;
                      return (
                        <span key={relatedId}>
                          {i > 0 && ", "}
                          <a href={`#${relatedId}`} className="text-accent hover:underline">
                            {relatedQ.question}
                          </a>
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
