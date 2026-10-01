import { Link } from "@tanstack/react-router";
import { SocialStrip, useSocials } from "./SocialStrip";
import { Sparkles } from "lucide-react";

export function Footer() {
  const SOCIALS = useSocials();
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SocialStrip />

        <div className="mt-12 grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-bold">Dynamon Universe</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A fan-made hub dedicated only to Dynamons World modded builds. Crafted with care by Dynamon Gamer for the
              community of trainers.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/" className="transition-colors hover:text-primary">Home</Link></li>
              <li><Link to="/mods" className="transition-colors hover:text-primary">All Mods</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-primary">About us</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-primary">Contact</Link></li>
              <li><Link to="/auth" className="transition-colors hover:text-primary">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/disclaimer" className="transition-colors hover:text-primary">Disclaimer</Link></li>
              <li><Link to="/disclaimer" hash="legal" className="transition-colors hover:text-primary">Terms of use</Link></li>
              <li><Link to="/disclaimer" hash="privacy" className="transition-colors hover:text-primary">Privacy policy</Link></li>
              <li><Link to="/disclaimer" hash="dmca" className="transition-colors hover:text-primary">DMCA</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Community</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href} target="_blank" rel="noreferrer noopener"
                    className="group inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card/60 transition-colors group-hover:border-primary/40 group-hover:text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Dynamon Universe. Not affiliated with the official developers of Dynamons World.</p>
          <p>All trademarks belong to their respective owners.</p>
        </div>
      </div>
    </footer>
  );
}
