import { useEffect, useRef, useState } from "react";
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
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    pending.current = true;
    const deadline = setTimeout(() => controller.abort(), 10_000);
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("avatar_pool")
          .select("id, url, gender, label")
          .eq("active", true)
          .order("sort_order")
          .retry(false)
          .abortSignal(controller.signal);
        if (!active) return;
        if (error || !Array.isArray(data)) setFailed(true);
        else {
          setPool(data as PoolAvatar[]);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        clearTimeout(deadline);
        if (active) {
          pending.current = false;
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [revision]);

  const retry = () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setRevision((value) => value + 1);
  };

  const list = pool.filter((a) => {
    if (gender === "male" || gender === "female") return a.gender === gender;
    return true;
  });

  if (loading && !failed) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading avatars
      </div>
    );
  }

  if (failed) {
    return (
      <div
        role="alert"
        aria-busy={loading}
        className="rounded-xl border border-border bg-background/40 p-4 text-sm"
      >
        <p>Could not load avatars. Your current selection is unchanged.</p>
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          className="touch-target mt-2 rounded-lg border border-border px-3 py-2 font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          Retry avatars
        </button>
        {loading && (
          <p role="status" className="mt-2 text-muted-foreground">
            Loading avatars
          </p>
        )}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {pool.length === 0
          ? "No avatars available yet."
          : "No avatars available for this selection."}
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-label="Available avatars"
      className="grid grid-cols-4 gap-3 sm:grid-cols-5"
    >
      {list.map((a, index) => {
        const selected = value === a.url;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              onChange(a.url);
              playSoft();
            }}
            className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
              selected
                ? "border-primary ring-2 ring-primary/40 scale-[1.03]"
                : "border-border hover:border-primary/40"
            }`}
            aria-pressed={selected}
            aria-label={a.label?.trim() || `Avatar ${index + 1}`}
          >
            <img
              src={a.url}
              alt={a.label ?? ""}
              className="h-full w-full object-cover transition-transform group-hover:scale-110"
              loading="lazy"
              width={256}
              height={256}
            />
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
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
