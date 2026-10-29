import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { HELP_TOPICS } from "@/lib/helpTopics";
import { pageSeoHead } from "@/lib/seo";
export const Route = createFileRoute("/help")({
  head: () =>
    pageSeoHead({
      path: "/help",
      title: "Help & Guide — Dynamon Universe",
      description:
        "Step-by-step help for builds, downloads, DG keys, Phoenix Passes, reward history and account settings.",
    }),
  component: Help,
});
function Help() {
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const topics = HELP_TOPICS.filter((t) =>
    (t.title + " " + t.steps.join(" ")).toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <PageShell>
      <header className="route-hero">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-ink">
          Your field guide
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold">Every step, explained.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          New here? Start with the first topic, or search for the action you need. You can read this
          guide without signing in.
        </p>
        <label className="mt-6 block text-sm">
          Search the guide
          <input
            type="search"
            disabled={!ready}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try keys, claim, download or notifications"
            className="control-input mt-2 min-h-12 w-full rounded-xl border px-4"
          />
        </label>
      </header>
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {topics.length} topics
      </p>
      <div className="mt-6 grid gap-4">
        {topics.map((t) => (
          <details key={t.id} id={t.id} className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-display text-lg font-bold">{t.title}</summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
              {t.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link
              to={t.link}
              className="touch-target mt-4 inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
              Open this feature →
            </Link>
          </details>
        ))}
      </div>
      {!topics.length && (
        <p className="mt-8">
          No matching topic. Try a shorter phrase or{" "}
          <Link to="/contact" className="underline">
            contact support
          </Link>
          .
        </p>
      )}
    </PageShell>
  );
}
