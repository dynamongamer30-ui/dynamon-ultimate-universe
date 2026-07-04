import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Star, Send } from "lucide-react";
import { useLocalState } from "@/hooks/useLocalState";
import { playClick, playSoft, playSuccess } from "@/lib/sound";
import { toast } from "sonner";

type Comment = { id: string; name: string; text: string; rating: number; at: number };

export function ModInteractions({ slug }: { slug: string }) {
  const [likes, setLikes] = useLocalState<number>(`mod:${slug}:likes`, 0);
  const [liked, setLiked] = useLocalState<boolean>(`mod:${slug}:liked`, false);
  const [comments, setComments] = useLocalState<Comment[]>(`mod:${slug}:comments`, []);
  const [ratings, setRatings] = useLocalState<number[]>(`mod:${slug}:ratings`, []);

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);

  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const toggleLike = () => {
    setLiked((v) => !v);
    setLikes((n) => (liked ? Math.max(0, n - 1) : n + 1));
    playSoft();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const c: Comment = {
      id: crypto.randomUUID(),
      name: name.trim() || "Trainer",
      text: text.trim(),
      rating,
      at: Date.now(),
    };
    setComments([c, ...comments]);
    setRatings([...ratings, rating]);
    setText(""); setName(""); setRating(5);
    playSuccess();
    toast.success("Thanks for the review!");
  };

  return (
    <section id="comments" className="mt-14 scroll-mt-24">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl glass p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Community Rating</p>
          <p className="mt-3 font-display text-5xl font-bold text-gradient">{(avg || 4.8).toFixed(1)}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < Math.round(avg || 4.8) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground"}`} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{ratings.length} ratings</p>
        </div>

        <div className="rounded-3xl glass p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Likes</p>
          <p className="mt-3 font-display text-5xl font-bold text-gradient-violet">{likes}</p>
          <button
            onClick={toggleLike}
            className={`mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors ${liked ? "text-rose-400 border-rose-400/40" : "hover:text-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-rose-400" : ""}`} />
            {liked ? "Liked" : "Like this mod"}
          </button>
        </div>

        <div className="rounded-3xl glass p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Comments</p>
          <p className="mt-3 font-display text-5xl font-bold">{comments.length}</p>
          <p className="mt-3 text-xs text-muted-foreground">Be kind. Be helpful.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={submit} className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold">Leave a review</h3>
          <p className="mt-1 text-sm text-muted-foreground">Help other trainers know what to expect.</p>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your rating</label>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                const active = (hover || rating) >= v;
                return (
                  <button
                    key={v}
                    type="button"
                    onMouseEnter={() => setHover(v)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => { setRating(v); playSoft(); }}
                    className="p-1"
                    aria-label={`Rate ${v} star`}
                  >
                    <Star className={`h-7 w-7 transition-all ${active ? "fill-[var(--gold)] text-[var(--gold)] scale-110" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trainer name (optional)"
            className="mt-4 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
            maxLength={40}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience…"
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
            maxLength={500}
          />

          <button
            type="submit"
            onMouseDown={playClick}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] glow-primary"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send className="h-4 w-4" /> Post review
          </button>
        </form>

        <div className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold">What trainers are saying</h3>
          <div className="mt-5 space-y-4">
            <AnimatePresence initial={false}>
              {comments.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  No reviews yet. Be the first to share your experience.
                </p>
              )}
              {comments.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-border bg-background/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-primary-foreground" style={{ background: "var(--gradient-violet)" }}>
                        {c.name[0]?.toUpperCase() ?? "T"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(c.at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < c.rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
