import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { pageSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageSeoHead({
    path: "/privacy",
    title: "Privacy Policy — Dynamon Universe",
    description: "Learn what Dynamon Universe collects, why it is used, how it is stored, and how to request deletion.",
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PageShell>
      <article className="prose prose-invert mx-auto max-w-3xl space-y-8">
        <header className="edge-light rounded-2xl glass p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dynamon Universe</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: October 1, 2026</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This policy explains how Dynamon Universe collects and uses information when you visit the website,
            create an account, interact with the community, or use an available download or unlock flow.
          </p>
        </header>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">1. Who we are</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Dynamon Universe is a fan-made community website operated by Dynamon Gamer. It is not affiliated with,
            endorsed by, or sponsored by the official Dynamons World developers or publisher.
          </p>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">2. Information we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li><strong className="text-foreground">Account information:</strong> Google account identity details made available through Google sign-in, such as your email address, name, profile image, and account identifier.</li>
            <li><strong className="text-foreground">Trainer profile:</strong> username, display name, gender selection, avatar selection, favorites, likes, ratings, comments, replies, and other content you choose to create.</li>
            <li><strong className="text-foreground">Technical information:</strong> basic browser/device information, security events, approximate request information, and activity needed to protect the site and operate key or download flows.</li>
            <li><strong className="text-foreground">Local browser data:</strong> preferences, cached interface state, session data, and install or notification choices stored by your browser.</li>
          </ul>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">3. How we use information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>To sign you in and keep your account secure.</li>
            <li>To provide your trainer profile and community contributions.</li>
            <li>To provide favorites, ratings, comments, notifications, rewards, and achievements.</li>
            <li>To prevent abuse, fraud, replayed access tokens, and unauthorized access.</li>
            <li>To maintain, troubleshoot, improve, and protect the website and its services.</li>
          </ul>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">4. Service providers</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Supabase provides authentication, database, realtime, and storage services. Google provides Google sign-in.
            Cloudflare may provide security, bot protection, edge Worker, and delivery services. These providers process
            information under their own policies and our configuration of their services.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Social links, embedded videos, shorteners, download destinations, and other external websites are governed
            by the privacy policies of the services you visit. We do not control those external services.
          </p>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">5. Cookies and local storage</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The site uses browser storage and similar technologies to keep authentication sessions working, remember
            preferences, support the interface, and reduce repeated requests. Blocking storage may prevent sign-in or
            some site features from working correctly.
          </p>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">6. Retention and deletion</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We keep information for as long as it is needed to provide requested features, maintain security, resolve
            disputes, or meet legitimate operational requirements. The current account flow is designed to remove
            inactive accounts and associated data after approximately 30 days without a sign-in, subject to backups,
            security records, and technical limitations.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            To ask about, correct, or delete account information, use the <Link to="/contact" className="text-primary hover:underline">Contact page</Link> and include the email address associated with your account. We may verify ownership before acting on a request.
          </p>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">7. Children’s privacy</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The website is not directed to children under the minimum age required by applicable law. If you believe a
            child has provided personal information without appropriate permission, contact us so we can review it.
          </p>
        </section>

        <section className="edge-light rounded-2xl glass p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">8. Changes and contact</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We may update this policy when the website, providers, or legal requirements change. The latest version is
            always posted at <Link to="/privacy" className="text-primary hover:underline">dynamongamer.space/privacy</Link>.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            For privacy questions or deletion requests, visit <Link to="/contact" className="text-primary hover:underline">dynamongamer.space/contact</Link>.
          </p>
        </section>

        <p className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
          This page is general website information, not legal advice. If your local law requires additional notices or
          rights, obtain advice appropriate to your situation.
        </p>
      </article>
    </PageShell>
  );
}
