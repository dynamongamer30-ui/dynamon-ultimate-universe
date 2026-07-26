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
      { title: "Contact Us — Dynamon Universe" },
      { name: "description", content: "Message the Dynamon Universe team about bugs, mod requests, or working together." },
      { property: "og:title", content: "Contact Dynamon Universe" },
      { property: "og:description", content: "Send us a message — a real person will read it." },
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
    toast.success("Message sent — we’ll get back to you soon.");
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
          <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl">{"Say hello."}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
            Found a bug? Want a mod we haven&apos;t made yet? Making videos and want to work together?
            The same people who test the mods read these messages &mdash; not a robot. To help us fix things fast,
            tell us three things: which mod, which phone you use, and what went wrong. Want a quicker reply?
            Message us on WhatsApp or Telegram instead.
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
              placeholder="Your email (so we can reply)"
              className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <textarea
            required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Which mod, which phone, and what happened?"
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
    </PageShell>
  );
}
