import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

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
        <header className="edge-light rounded-2xl glass p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Read this first</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight">Disclaimer & Safety</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dynamon Universe is a fan-made, non-commercial hub. We are not affiliated with, endorsed by, or
            sponsored by the official Dynamons World developers or publisher. All trademarks belong to their
            respective owners.
          </p>
          <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed text-foreground"><span className="font-bold text-primary">In simple words: </span>This is a fan site. We are not the company that made Dynamons World, and they don&apos;t run or approve this site. The game and its name belong to them.</p>
        </header>

        <section id="legal" className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Legal</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Mod APKs may violate the original game's Terms of Service. You are solely responsible for how you
            use any build you discover here. Always own a legitimate copy of the original game and respect
            the developers — consider supporting them through the official channels.
          </p>
          <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed text-foreground"><span className="font-bold text-primary">In simple words: </span>Using a mod can break the game&apos;s rules, and that&apos;s your choice to make. Please also own the real game and support the people who made it.</p>
        </section>

        <section id="privacy" className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Privacy</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We use a lightweight account system (Google or email) so you can download mods, leave ratings
            and comments. We only store your email and the activity you create on the site. Likes and
            ratings may also be cached locally in your browser for performance. Embedded social links open
            in their own platforms with their own privacy policies.
          </p>
          <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed text-foreground"><span className="font-bold text-primary">In simple words: </span>We save your email and the things you do here (like ratings and comments) so the site works. Nothing else. When you tap a social link, that app&apos;s own rules apply, not ours. If you don&apos;t sign in for 30 days, your account and its data are automatically deleted.</p>
        </section>

        <section id="dmca" className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">DMCA</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If you are a rights holder and believe content on Dynamon Universe infringes your rights, contact
            us via the contact page with the URL of the content, a description of the work, and your contact
            information. We respond within 72 hours.
          </p>
          <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed text-foreground"><span className="font-bold text-primary">In simple words: </span>If you own something posted here and want it taken down, message us on the Contact page with the link and proof it&apos;s yours. We reply within 3 days.</p>
        </section>
      </article>
    </PageShell>
  );
}
