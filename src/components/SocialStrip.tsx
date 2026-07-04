import { motion } from "motion/react";
import { Youtube, Instagram, Send, MessageCircle } from "lucide-react";
import { playSoft } from "@/lib/sound";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function useSocials() {
  const { socials } = useSiteSettings();
  return [
    { label: "WhatsApp",  href: socials.whatsapp,  Icon: MessageCircle, color: "oklch(0.78 0.17 155)" },
    { label: "YouTube",   href: socials.youtube,   Icon: Youtube,       color: "oklch(0.65 0.24 27)" },
    { label: "Instagram", href: socials.instagram, Icon: Instagram,     color: "oklch(0.62 0.22 0)" },
    { label: "Telegram",  href: socials.telegram,  Icon: Send,          color: "oklch(0.7 0.16 240)" },
  ] as const;
}

/** @deprecated use useSocials() to reflect owner edits */
export const SOCIALS = [
  { label: "WhatsApp",  href: "https://whatsapp.com/channel/0029VbBdAcZ05MUmgk8cQP05", Icon: MessageCircle, color: "oklch(0.78 0.17 155)" },
  { label: "YouTube",   href: "https://youtube.com/@dynamongamer07",                   Icon: Youtube,       color: "oklch(0.65 0.24 27)" },
  { label: "Instagram", href: "https://www.instagram.com/stoicist_zayen",              Icon: Instagram,     color: "oklch(0.62 0.22 0)" },
  { label: "Telegram",  href: "https://t.me/dynamonsworld07",                          Icon: Send,          color: "oklch(0.7 0.16 240)" },
] as const;

export function SocialStrip({ variant = "full" }: { variant?: "full" | "compact" }) {
  const SOCIALS = useSocials();
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        {SOCIALS.map(({ label, href, Icon, color }) => (
          <a
            key={label} href={href} target="_blank" rel="noreferrer noopener"
            onMouseDown={playSoft} aria-label={label}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground transition-all hover:scale-110 hover:text-foreground"
            style={{ ["--c" as string]: color }}
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl glass p-6 sm:p-10">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-accent/20 blur-3xl" aria-hidden />
      <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Join the Universe</p>
          <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Get drops, guides & weekly mod news</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow Dynamon Gamer — every new mod is announced first on these channels.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {SOCIALS.map(({ label, href, Icon }) => (
            <motion.a
              key={label} href={href} target="_blank" rel="noreferrer noopener"
              onMouseDown={playSoft}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Icon className="h-4 w-4" /><span>{label}</span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
