import CookiePreferenceControl from "@/components/CookiePreferenceControl";

export const metadata = {
  title: "Cookie Policy | Edge Analysts",
  description: "How Edge Analysts uses cookies, and how to manage your preference.",
};

const ESSENTIAL_COOKIES = [
  {
    name: "ea_cookie_consent",
    purpose: "Remembers your accept/decline choice so we don't ask again.",
    duration: "180 days",
  },
];

export default function CookiesPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-4xl tracking-wide">Cookie Policy</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          This page explains what cookies Edge Analysts uses, why, and how you can change your
          preference at any time.
        </p>
      </section>

      <section className="border-t border-line pt-4">
        <h2 className="font-display text-2xl tracking-wide">Manage your preference</h2>
        <div className="mt-4 max-w-sm">
          <CookiePreferenceControl />
        </div>
      </section>

      <section className="border-t border-line pt-4">
        <h2 className="font-display text-2xl tracking-wide">Essential cookies</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          These are required for the site to function and are set regardless of your choice above.
        </p>
        <div className="mt-4 divide-y divide-line border border-line">
          {ESSENTIAL_COOKIES.map((c) => (
            <div key={c.name} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
              <span className="font-data text-xs text-accent">{c.name}</span>
              <span className="text-sm text-ink sm:col-span-1">{c.purpose}</span>
              <span className="font-data text-xs text-ink sm:text-right">{c.duration}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-4">
        <h2 className="font-display text-2xl tracking-wide">Non-essential cookies</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          We don&apos;t currently run analytics, advertising, or tracking cookies of our own. If
          that changes — for example, to add site analytics — those scripts will only load if you
          accept above, and this page will be updated to list them.
        </p>
      </section>

      <section className="border-t border-line pt-4">
        <h2 className="font-display text-2xl tracking-wide">Third-party links</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          Links to bookmakers and other operators take you to their own websites, which set their
          own cookies under their own policies once you&apos;re there. We don&apos;t control or
          receive data from those cookies.
        </p>
      </section>
    </div>
  );
}
