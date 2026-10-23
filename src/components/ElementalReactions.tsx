import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playSoft } from "@/lib/sound";
import { toast } from "sonner";

import { setOwnReaction, type ReactionKey, type ReactionRow } from "@/lib/reactionCounts";

const REACTIONS: { key: ReactionKey; emoji: string; color: string }[] = [
  { key: "fire", emoji: "🔥", color: "text-orange-300" },
  { key: "water", emoji: "💧", color: "text-cyan-300" },
  { key: "thunder", emoji: "⚡", color: "text-sky-300" },
  { key: "leaf", emoji: "🌿", color: "text-lime-300" },
  { key: "spirit", emoji: "✨", color: "text-fuchsia-300" },
];

export function ElementalReactions({
  commentId,
  rows,
  loading,
  loadError,
  prepare,
  update,
}: {
  commentId: string;
  rows: ReactionRow[];
  loading: boolean;
  loadError: boolean;
  prepare: () => Promise<void>;
  update: (change: (previous: ReactionRow[]) => ReactionRow[]) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const toggle = async (reaction: ReactionKey) => {
    if (!user || loading || loadError || locked.current) return;
    locked.current = true;
    setBusy(true);
    playSoft();
    const mine = !!rows.find((r) => r.reaction === reaction)?.mine;
    try {
      await prepare();
      if (!active.current) return;
      update((previous) => setOwnReaction(previous, reaction, !mine));
      const { data, error } = mine
        ? await supabase
            .from("comment_reactions")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", user.id)
            .eq("reaction", reaction)
            .select("user_id, reaction")
        : await supabase
            .from("comment_reactions")
            .insert({ comment_id: commentId, user_id: user.id, reaction });
      if (
        error ||
        (mine && !data?.some((row) => row.user_id === user.id && row.reaction === reaction))
      )
        throw error ?? new Error("Reaction removal was not confirmed");
      if (active.current) {
        update((previous) => setOwnReaction(previous, reaction, !mine));
        toast.dismiss(`reaction-${commentId}`);
      }
    } catch {
      if (active.current) {
        update((previous) => setOwnReaction(previous, reaction, mine));
        toast.error("Could not update reaction. Try again.", { id: `reaction-${commentId}` });
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Elemental reactions"
      aria-busy={loading || busy}
      aria-describedby={loadError ? "community-reaction-error" : undefined}
    >
      {REACTIONS.map((r) => {
        const row = rows.find((x) => x.reaction === r.key);
        const count = row?.count ?? 0;
        const mine = !!user && !!row?.mine;
        return (
          <motion.button
            key={r.key}
            whileTap={{ scale: 0.85 }}
            onClick={() => toggle(r.key)}
            disabled={!user || loading || loadError || busy}
            className={`touch-target inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${mine ? "border-primary/50 bg-primary/10" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`${mine ? "Remove" : "Add"} ${r.key} reaction`}
            aria-pressed={mine}
          >
            <span>{r.emoji}</span>
            {count > 0 && <span className={mine ? r.color : ""}>{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
