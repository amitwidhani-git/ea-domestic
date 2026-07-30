"use client";
import { useId, useState, type KeyboardEvent } from "react";

interface Props {
  source?: string;   // where it's embedded, passed to the API
  compact?: boolean; // true = single-line layout for header/banner use
}

type Status = "idle" | "loading" | "success" | "error";
type Mode = "subscribe" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUCCESS_MESSAGE: Record<string, string> = {
  subscribed: "You're in. Predictions straight to your inbox.",
  already_subscribed: "You're already on the list — check your inbox.",
  already_member: "You've already got a full account — no need to subscribe again.",
};

const REGISTER_STUB_MESSAGE =
  "Account creation coming soon. Subscribe for now and we'll notify you when it's ready.";

// Feature toggle — off by default. Set NEXT_PUBLIC_SUBSCRIBE_ENABLED=true to turn it back on.
const SUBSCRIBE_ENABLED = process.env.NEXT_PUBLIC_SUBSCRIBE_ENABLED === "true";

export default function SubscribeRegister(props: Props) {
  if (!SUBSCRIBE_ENABLED) return null;
  return <SubscribeRegisterForm {...props} />;
}

// Kept as a separate component so the hooks below are never called conditionally —
// the feature-toggle bail-out above happens before this component (and its hooks) ever mounts.
function SubscribeRegisterForm({ source = "unknown", compact = false }: Props) {
  const uid = useId();
  const emailId = `${uid}-email`;
  const nameId = `${uid}-name`;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loading = status === "loading";

  async function submit(nextMode: Mode) {
    if (loading) return;

    if (!EMAIL_RE.test(email.trim())) {
      setMode(nextMode);
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setMode(nextMode);
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, source }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(
        nextMode === "register"
          ? REGISTER_STUB_MESSAGE
          : SUCCESS_MESSAGE[data.status as string] ?? SUCCESS_MESSAGE.subscribed
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  function onEmailKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit("subscribe");
  }

  const messageEl = message && status !== "idle" && status !== "loading" && (
    <p role="status" className={`font-data text-[11px] leading-relaxed ${status === "error" ? "text-loss" : "text-accent"}`}>
      {message}
    </p>
  );

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onEmailKeyDown}
            placeholder="Email address"
            aria-label="Email address"
            className="min-w-0 flex-1 border border-line bg-bg px-3 py-1.5 font-body text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => submit("subscribe")}
            className="border border-accent bg-accent px-3 py-1.5 font-data text-[11px] uppercase tracking-widest text-bg transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && mode === "subscribe" ? "…" : "Subscribe"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => submit("register")}
            className="border border-line px-3 py-1.5 font-data text-[11px] uppercase tracking-widest text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && mode === "register" ? "…" : "Register"}
          </button>
          <span className="font-data text-[9px] uppercase tracking-widest text-muted" aria-label="18 plus, gamble responsibly">
            18+
          </span>
        </div>
        {messageEl && <div className="mt-1.5">{messageEl}</div>}
      </div>
    );
  }

  return (
    <div className="border border-line bg-panel p-6">
      <h2 className="font-display text-3xl tracking-wide text-ink">Get the Edge</h2>
      <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-ink">
        Matchday predictions direct to your inbox. Register for the predictions league.
      </p>

      <div className="mt-5 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <div>
          <label htmlFor={emailId} className="mb-1 block font-data text-[10px] uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onEmailKeyDown}
            placeholder="you@example.com"
            className="w-full border border-line bg-bg px-3 py-2 font-body text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor={nameId} className="mb-1 block font-data text-[10px] uppercase tracking-widest text-muted">
            Name (optional)
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className="w-full border border-line bg-bg px-3 py-2 font-body text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => submit("subscribe")}
          className="border border-accent bg-accent px-5 py-2.5 font-display text-lg tracking-wider text-bg transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && mode === "subscribe" ? "Subscribing…" : "Subscribe Free"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => submit("register")}
          className="border border-line px-5 py-2.5 font-display text-lg tracking-wider text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && mode === "register" ? "Creating…" : "Create Account"}
        </button>
        <span className="font-data text-[10px] uppercase tracking-widest text-muted" aria-label="18 plus, gamble responsibly">
          18+
        </span>
      </div>

      {messageEl && <div className="mt-3">{messageEl}</div>}

      <p className="mt-4 font-data text-[10px] leading-relaxed text-muted">
        No spam. Unsubscribe any time. 18+{" "}
        <a
          href="https://www.begambleaware.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-ink"
        >
          BeGambleAware.org
        </a>
      </p>
    </div>
  );
}
