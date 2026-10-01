import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playSoft } from "@/lib/sound";

type PoolAvatar = { id: string; url: string; gender: "male" | "female"; label: string | null };

type Props = {
  value: string | null; // the selected avatar's URL, or null
  onChange: (url: string) => void;
  gender: "male" | "female" | "other" | null;
};

export function AvatarPicker({ value, onChange, gender }: Props) {
  const [pool, setPool] = useState<PoolAvatar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("avatar_pool").select("id, url, gender, label").eq("active", true).order("sort_order")
      .then(({ data }) => { setPool((data ?? []) as PoolAvatar[]); setLoading(false); });
  }, []);

  const list = pool.filter((a) => {
    if (gender === "male" || gender === "female") return a.gender === gender;
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">No avatars available yet.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
      {list.map((a) => {
        const selected = value === a.url;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => { onChange(a.url); playSoft(); }}
            className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
              selected ? "border-primary ring-2 ring-primary/40 scale-[1.03]" : "border-border hover:border-primary/40"
            }`}
            aria-pressed={selected}
            aria-label={a.label ?? "Avatar"}
          >
            <img src={a.url} alt={a.label ?? ""} className="h-full w-full object-cover transition-transform group-hover:scale-110" loading="lazy" width={256} height={256} />
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
  );
}
