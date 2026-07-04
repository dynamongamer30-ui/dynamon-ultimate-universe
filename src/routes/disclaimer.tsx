import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { SocialStrip } from "@/components/SocialStrip";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer & Safety — Dynamon Universe" },
      { name: "description", content: "Important legal, safety and DMCA information for Dynamon Universe — a fan-made Dynamons World community hub." },
    ],
  }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <PageShell>
      <article className="prose prose-invert mx-auto max-w-3xl space-y-10">
        <header className="rounded-3xl glass p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Read this first</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold">Disclaimer & Safety</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dynamon Universe is a fan-made, non-commercial hub. We are not affiliated with, endorsed by, or
            sponsored by the official Dynamons World developers or publisher. All trademarks belong to their
            respective owners.
          </p>
        </header>

        <section id="legal" className="rounded-3xl glass p-8">
          <h2 className="font-display text-2xl font-bold">Legal</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Mod APKs may violate the original game's Terms of Service. You are solely responsible for how you
            use any build you discover here. Always own a legitimate copy of the original game and respect
            the developers — consider supporting them through the official channels.
          </p>
        </section>

        <section id="privacy" className="rounded-3xl glass p-8">
          <h2 className="font-display text-2xl font-bold">Privacy</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We use a lightweight account system (Google or email) so you can download mods, leave ratings
            and comments. We only store your email and the activity you create on the site. Likes and
            ratings may also be cached locally in your browser for performance. Embedded social links open
            in their own platforms with their own privacy policies.
          </p>
        </section>

        <section id="dmca" className="rounded-3xl glass p-8">
          <h2 className="font-display text-2xl font-bold">DMCA</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If you are a rights holder and believe content on Dynamon Universe infringes your rights, contact
            us via the contact page with the URL of the content, a description of the work, and your contact
            information. We respond within 72 hours.
          </p>
        </section>

        <SocialStrip />
      </article>
    </PageShell>
  );
}
