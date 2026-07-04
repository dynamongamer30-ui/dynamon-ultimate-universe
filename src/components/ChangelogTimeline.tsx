import { motion } from "motion/react";
import { Calendar, GitCommit } from "lucide-react";
import type { Mod } from "@/lib/mods";

export function ChangelogTimeline({ entries, glow }: { entries: Mod["changelog"]; glow: string }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-primary/30 to-transparent" aria-hidden />
      <ol className="space-y-5">
        {entries.map((c, i) => (
          <motion.li
            key={c.version}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="relative pl-12"
          >
            <span
              className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: glow }}
            >
              <GitCommit className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-2xl glass p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-lg font-bold">v{c.version}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {new Date(c.date).toLocaleDateString()}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {c.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {n}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
