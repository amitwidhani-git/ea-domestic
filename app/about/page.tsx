import about from "@/data/about.json";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-4xl tracking-wide">About Us</h1>
        <p className="mt-4 max-w-2xl font-display text-2xl leading-snug tracking-wide text-ink">
          {about.intro.lead}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink">
          {about.intro.body}
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-wide text-ink">
          {about.model.heading}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink">
          {about.model.body}
        </p>
      </section>

      <section>
        <p className="max-w-2xl text-sm leading-relaxed text-ink">
          {about.product.body}
        </p>
      </section>

      <section>
        <p className="max-w-2xl text-sm leading-relaxed text-ink">
          {about.beliefs.body}
        </p>
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
