import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { SocialStrip } from "@/components/SocialStrip";
import { Mail, Send } from "lucide-react";
import { playClick, playSuccess } from "@/lib/sound";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Dynamon Universe" },
      { name: "description", content: "Reach the Dynamon Universe team for collaborations, mod requests, or bug reports." },
      { property: "og:title", content: "Contact Dynamon Universe" },
      { property: "og:description", content: "Send a message to the Dynamon Universe team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    playSuccess();
    toast.success("Message sent — we'll reply on your favorite channel.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <PageShell>
      <section className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            <span className="inline-block h-px w-8 bg-primary" aria-hidden />
            Get in touch
          </p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl">{"Let's talk Dynamons."}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
            Found a bug in a build? Want an edition we haven&apos;t made yet? Making content and looking to collab?
            This inbox is read by the same people who test the mods — not a support bot. Tell us the edition,
            your device, and what happened, and we&apos;ll get you a real answer. For the fastest replies,
            ping us on WhatsApp or Telegram.
          </p>
          <div className="mt-6">
            <SocialStrip variant="compact" />
          </div>
        </div>

        <form onSubmit={submit} className="edge-light rounded-2xl glass p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Your email"
              className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <textarea
            required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="How can we help?"
            className="mt-4 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit" onMouseDown={playClick}
            className="press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110"
          >
            <Send className="h-4 w-4" /> Send message
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="h-3 w-3" /> Or email hello@dynamon.universe
          </p>
        </form>
      </section>

      <section className="mt-16">
        <SocialStrip />
      </section>
    </PageShell>
  );
}
