import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { avatars, type AvatarOption, type AvatarStyle } from "@/lib/avatars";
import { playSoft } from "@/lib/sound";

type Props = {
  value: string | null;
  onChange: (id: string) => void;
  gender: "male" | "female" | "other" | null;
};

export function AvatarPicker({ value, onChange, gender }: Props) {
  const [style, setStyle] = useState<AvatarStyle>("trainer");

  const list: AvatarOption[] = avatars.filter((a) => {
    if (a.style !== style) return false;
    if (gender === "male" || gender === "female") return a.gender === gender;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full border border-border bg-card/60 p-1 text-xs font-semibold">
        {(["trainer", "anime"] as const).map((s) => (
          <button
            key={s} type="button"
            onClick={() => { setStyle(s); playSoft(); }}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${
              style === s ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            style={style === s ? { background: "var(--gradient-primary)" } : undefined}
          >
            {s === "trainer" ? "Trainer style" : "Anime style"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {list.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); playSoft(); }}
              className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                selected ? "border-primary ring-2 ring-primary/40 scale-[1.03]" : "border-border hover:border-primary/40"
              }`}
              aria-pressed={selected}
              aria-label={a.label}
            >
              <img src={a.url} alt={a.label} className="h-full w-full object-cover transition-transform group-hover:scale-110" loading="lazy" width={256} height={256} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <p className="absolute inset-x-0 bottom-1 truncate px-2 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                {a.label}
              </p>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
