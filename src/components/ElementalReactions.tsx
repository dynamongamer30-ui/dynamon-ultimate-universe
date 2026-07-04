import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playSoft } from "@/lib/sound";

type ReactionKey = "fire" | "water" | "thunder" | "leaf" | "spirit";

const REACTIONS: { key: ReactionKey; emoji: string; color: string }[] = [
  { key: "fire", emoji: "🔥", color: "text-orange-300" },
  { key: "water", emoji: "💧", color: "text-cyan-300" },
  { key: "thunder", emoji: "⚡", color: "text-sky-300" },
  { key: "leaf", emoji: "🌿", color: "text-lime-300" },
  { key: "spirit", emoji: "✨", color: "text-fuchsia-300" },
];

type Row = { user_id: string; reaction: ReactionKey };

export function ElementalReactions({ commentId }: { commentId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.from("comment_reactions").select("user_id, reaction").eq("comment_id", commentId).then(({ data }) => {
      if (!cancelled) setRows((data ?? []) as Row[]);
    });
    return () => { cancelled = true; };
  }, [commentId]);

  const toggle = async (reaction: ReactionKey) => {
    if (!user) return;
    playSoft();
    const mine = rows.find((r) => r.user_id === user.id && r.reaction === reaction);
    if (mine) {
      setRows((p) => p.filter((r) => !(r.user_id === user.id && r.reaction === reaction)));
      await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id).eq("reaction", reaction);
    } else {
      setRows((p) => [...p, { user_id: user.id, reaction }]);
      await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: user.id, reaction });
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((r) => {
        const count = rows.filter((x) => x.reaction === r.key).length;
        const mine = !!user && rows.some((x) => x.user_id === user.id && x.reaction === r.key);
        return (
          <motion.button
            key={r.key} whileTap={{ scale: 0.85 }}
            onClick={() => toggle(r.key)}
            disabled={!user}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${mine ? "border-primary/50 bg-primary/10" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={`React ${r.emoji}`}
          >
            <span>{r.emoji}</span>
            {count > 0 && <span className={mine ? r.color : ""}>{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
