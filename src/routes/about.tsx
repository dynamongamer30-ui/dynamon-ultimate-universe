import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Heart, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Dynamon Universe" },
      { name: "description", content: "Dynamon Universe is a fan-made site for Dynamons World mods only. Here’s who we are and how we work." },
      { property: "og:title", content: "About Dynamon Universe" },
      { property: "og:description", content: "Why we made a site just for Dynamons World mods." },
    ],
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
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl">Made by fans, for fans.</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          We play Dynamons World too. We got fed up with mod sites full of pop-ups, fake download buttons,
          and mods for games we don&apos;t even play. So we made the site we wished existed: one place, one game,
          nothing else. We install and play every mod ourselves on real phones before putting it here. We write
          honest update notes. And what you download is exactly what the page says it is. That&apos;s it.
        </p>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { Icon: Sparkles, title: "One game only", text: "We only do Dynamons World. One game, eight versions, nothing else. We’ll never add mods for other games." },
          { Icon: Heart, title: "Tested by hand", text: "We install and play every mod on real phones first. If it crashes for us, we don’t put it up." },
          { Icon: Users, title: "You decide", text: "Your ratings, reviews, and requests decide which mods we show first and what we make next." },
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
