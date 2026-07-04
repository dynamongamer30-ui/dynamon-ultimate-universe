import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { SocialStrip } from "@/components/SocialStrip";
import { Heart, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Dynamon Universe" },
      { name: "description", content: "Dynamon Universe is a community-built hub focused only on Dynamons World mod APKs. Learn our story and values." },
      { property: "og:title", content: "About Dynamon Universe" },
      { property: "og:description", content: "Why we built the only Dynamons World-focused mod hub." },
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
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl">Built by Dynamon fans, for Dynamon fans.</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          We grew up training, battling, and collecting in Dynamons World — and we got tired of hunting for mods
          on sketchy aggregator sites buried under popups, fake download buttons, and builds for a hundred games
          we didn&apos;t play. So we built the site we wanted: one focused vault, dedicated entirely to Dynamons World.
          Every edition is hand-tested on real devices before it ships, every changelog is honest, and every download
          is exactly what it says it is. That&apos;s the whole promise.
        </p>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { Icon: Sparkles, title: "Focused", text: "Only Dynamons World. One game, eight editions, zero clutter — we will never dilute the vault with other titles." },
          { Icon: Heart, title: "Crafted", text: "Every build is installed, played, and stress-tested on real devices before it goes live. If it crashes for us, it never ships to you." },
          { Icon: Users, title: "Community", text: "Ratings, reviews, and requests from trainers like you decide which editions we feature and what we build next." },
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

      <section className="mt-16">
        <SocialStrip />
      </section>
    </PageShell>
  );
}
