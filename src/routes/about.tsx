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
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our story</p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">Built by Dynamon fans, for Dynamon fans.</h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          We grew up training, battling and collecting in Dynamons World. We wanted a single, beautiful place
          dedicated to the game — no clutter from a hundred other titles, no shady popups. Just careful, curated
          mod builds and a kind community.
        </p>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { Icon: Sparkles, title: "Focused", text: "Only Dynamons World. No other games, ever." },
          { Icon: Heart, title: "Crafted", text: "Each build is hand-tested before it goes live." },
          { Icon: Users, title: "Community", text: "Reviews and ratings shape what we feature next." },
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
