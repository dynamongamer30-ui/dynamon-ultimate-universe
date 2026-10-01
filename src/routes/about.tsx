import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Heart, Sparkles, Users } from "lucide-react";
import { pageSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => pageSeoHead({
    path: "/about",
    title: "About Dynamon Universe — A Focused Dynamons World Build Hub",
    description: "Learn how Dynamon Universe organizes Dynamons World build pages with feature notes, version details, changelogs, community signals, and guided unlock access.",
  }),
  component: About,
});

function About() {
  return (
    <PageShell>
      <section className="relative overflow-hidden edge-light rounded-2xl glass p-8 sm:p-14">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          Our story
        </p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl">A focused hub for Dynamons World builds.</h1>
          <p className="page-copy mt-5 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          Dynamon Universe is built for players who want less noise and clearer choices. Every edition has a dedicated
          page with its version, headline features, changelog, community signals, and a guided unlock path. The goal is
          simple: help trainers compare Dynamons World builds without bouncing through unrelated pages.
        </p>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { Icon: Sparkles, title: "One game, clearly organized", text: "Every page stays focused on Dynamons World, so you can compare builds instead of filtering through unrelated content." },
          { Icon: Heart, title: "Details before decisions", text: "Feature notes, version labels, and changelogs help you understand an edition before you start the unlock flow." },
          { Icon: Users, title: "Community-led discovery", text: "Ratings, favorites, and trainer feedback make it easier to spot the editions players return to most." },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="rounded-2xl glass p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
