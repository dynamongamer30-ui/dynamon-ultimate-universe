import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Send, Star, Loader2, Trash2, Reply as ReplyIcon } from "lucide-react";
import { OwnerBadge } from "@/components/OwnerBadge";
import { ElementalReactions } from "@/components/ElementalReactions";
import { ReportButton } from "@/components/ReportDialog";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useConfirm } from "@/hooks/useConfirm";
import { useGamification } from "@/hooks/useGamification";
import { playClick, playSoft, playSuccess } from "@/lib/sound";
import { toast } from "sonner";

type CommentRow = {
  id: string;
  mod_slug: string;
  user_id: string;
  body: string;
  rating: number | null;
  created_at: string;
  parent_id: string | null;
};

type AuthorRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  custom_avatar_url: string | null;
  is_owner: boolean;
};

type LikeRow = { comment_id: string; user_id: string };

type EnrichedComment = CommentRow & {
  author?: AuthorRow;
  likeCount: number;
  likedByMe: boolean;
};

export function CommentsPanel({
  slug,
  combinedRating,
  combinedCount,
  combinedLikes,
}: {
  slug: string;
  /** Blended (owner seed + real) rating average, same number shown at the
   * top of the mod page. When provided, this panel's "Community Rating"
   * card uses it instead of recalculating from only the real comments
   * below — so the two numbers on the page always agree. */
  combinedRating?: number;
  /** Blended (owner seed + real) rating count, same as above. */
  combinedCount?: number;
  /** Blended (owner seed + real) count of likes on reviews. */
  combinedLikes?: number;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { award, grant } = useGamification();
  const confirm = useConfirm();
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rawComments } = await supabase
      .from("comments")
      .select("id, mod_slug, user_id, body, rating, created_at, parent_id")
      .eq("mod_slug", slug)
      .order("created_at", { ascending: false });

    const list = (rawComments ?? []) as CommentRow[];
    if (list.length === 0) { setComments([]); setLoading(false); return; }

    const authorIds = [...new Set(list.map((c) => c.user_id))];
    const commentIds = list.map((c) => c.id);

    const [{ data: authors }, { data: likes }] = await Promise.all([
      supabase.from("public_profiles").select("id, username, display_name, avatar_url, custom_avatar_url, is_owner").in("id", authorIds),
      supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds),
    ]);

    const authorMap = new Map<string, AuthorRow>((authors ?? []).map((a) => [a.id as string, a as unknown as AuthorRow]));
    const likeRows = (likes ?? []) as LikeRow[];

    const enriched: EnrichedComment[] = list.map((c) => {
      const likesFor = likeRows.filter((l) => l.comment_id === c.id);
      return {
        ...c,
        author: authorMap.get(c.user_id),
        likeCount: likesFor.length,
        likedByMe: !!user && likesFor.some((l) => l.user_id === user.id),
      };
    });
    setComments(enriched);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  const topLevel = useMemo(() => comments.filter((c) => !c.parent_id), [comments]);
  const visibleComments = useMemo(() => topLevel.filter((c) => c.body.trim().length > 0), [topLevel]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, EnrichedComment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = map.get(c.parent_id) ?? [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return map;
  }, [comments]);

  const ratings = topLevel.map((c) => c.rating).filter((r): r is number => typeof r === "number");
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const submitRating = async () => {
    if (!user || !profile) { toast.error("Sign in and complete your profile first"); return; }
    if (rating === null) { toast.error("Choose a star rating first"); return; }
    setRatingBusy(true);
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("comments")
        .select("id")
        .eq("mod_slug", slug)
        .eq("user_id", user.id)
        .is("parent_id", null)
        .not("rating", "is", null)
        .maybeSingle();
      if (lookupError) throw lookupError;
      const { error } = existing
        ? await supabase.from("comments").update({ rating }).eq("id", existing.id)
        : await supabase.from("comments").insert({ mod_slug: slug, user_id: user.id, body: "", rating, parent_id: null });
      if (error) throw error;
      setRating(null);
      playSuccess();
      toast.success(`${rating}-star review submitted`);
      award(15, "Reviewed");
      grant("first_review");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit rating");
    } finally {
      setRatingBusy(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) { toast.error("Sign in and complete your profile first"); return; }
    const trimmedBody = body.trim();
    if (!trimmedBody) { toast.error("Write a comment first"); return; }
    setCommentBusy(true);
    try {
      const { error } = await supabase.from("comments").insert({
        mod_slug: slug, user_id: user.id, body: trimmedBody, rating: null, parent_id: null,
      });
      if (error) throw error;
      setBody("");
      playSuccess();
      toast.success("Comment submitted");
      award(15, "Commented");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit comment");
    } finally {
      setCommentBusy(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!user || !profile) { toast.error("Sign in first"); return; }
    if (!replyBody.trim()) return;
    const { error } = await supabase.from("comments").insert({
      mod_slug: slug, user_id: user.id, body: replyBody.trim(), rating: null, parent_id: parentId,
    });
    if (error) { toast.error(error.message); return; }
    setReplyBody(""); setReplyOpen(null);
    playSuccess();
    award(5, "Replied");
    load();
  };

  const toggleLike = async (c: EnrichedComment) => {
    if (!user) { toast.error("Sign in to like"); return; }
    playSoft();
    setComments((prev) => prev.map((x) =>
      x.id === c.id
        ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
        : x,
    ));
    if (c.likedByMe) {
      await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    }
  };

  const remove = async (c: EnrichedComment) => {
    if (!user || (c.user_id !== user.id && !profile?.is_owner)) return;
    if (!(await confirm({
      title: "Delete review",
      description: "Delete this review? This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    }))) return;
    await supabase.from("comments").delete().eq("id", c.id);
    setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  };

  const renderComment = (c: EnrichedComment, isReply = false) => {
    const avatar = c.author?.custom_avatar_url || c.author?.avatar_url;
    const authorName = c.author?.display_name ?? "Trainer";
    const isMine = user?.id === c.user_id;
    const canRemove = isMine || profile?.is_owner;
    const replies = repliesByParent.get(c.id) ?? [];
    return (
      <motion.div
        key={c.id}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className={`rounded-2xl border border-border bg-background/40 p-4 ${isReply ? "ml-6 border-l-2 border-l-primary/30" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatar ? (
              <img src={avatar} alt="" className={`h-10 w-10 rounded-full object-cover ${c.author?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/30"}`} />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full font-bold text-primary-foreground" style={{ background: "var(--gradient-violet)" }}>
                {(c.author?.display_name ?? "T")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{authorName}</p>
                {c.author?.is_owner && <OwnerBadge size="xs" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                @{c.author?.username ?? "trainer"} · {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        {c.body ? (
          <p className="mt-3 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-muted-foreground">{c.body}</p>
        ) : (
          <p className="mt-3 text-sm italic text-muted-foreground/60">Left a rating without writing a review.</p>
        )}

        {!isReply && <div className="mt-3"><ElementalReactions commentId={c.id} /></div>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleLike(c)}
            aria-label={`${c.likedByMe ? "Unlike" : "Like"} review by ${authorName}`}
            aria-pressed={c.likedByMe}
            className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors ${
              c.likedByMe ? "border-rose-400/40 text-rose-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${c.likedByMe ? "fill-rose-400" : ""}`} />
            {c.likeCount}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => { setReplyOpen(replyOpen === c.id ? null : c.id); setReplyBody(""); }}
              aria-expanded={replyOpen === c.id}
              aria-controls={`reply-${c.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ReplyIcon className="h-3.5 w-3.5" /> Reply
            </button>
          )}
          <ReportButton targetType="comment" targetId={c.id} />
          {canRemove && (
            <button onClick={() => remove(c)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        <AnimatePresence>
          {replyOpen === c.id && !isReply && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
              <label htmlFor={`reply-${c.id}`} className="sr-only">Reply to {authorName}</label>
              <textarea
                id={`reply-${c.id}`} name={`reply-${c.id}`}
                value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Reply to @${c.author?.username ?? "trainer"}…`} rows={2} maxLength={500}
                className="w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setReplyOpen(null)} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={() => submitReply(c.id)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <Send className="h-3 w-3" /> Post reply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((r) => renderComment(r, true))}
          </div>
        )}
      </motion.div>
    );
  };

  const displayRating = combinedRating != null ? combinedRating : avg;
  const displayCount = combinedCount != null ? combinedCount : ratings.length;

  return (
    <section id="comments" className="mt-14 scroll-mt-24">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Community Rating" value={(displayRating || 0).toFixed(1)} sub={`${displayCount} ratings`} stars={Math.round(displayRating)} />
        <StatCard label="Reviews" value={String(displayCount)} sub="Be helpful. Be honest." />
        <StatCard label="Likes" value={String((combinedLikes ?? 0) + comments.reduce((s, c) => s + c.likeCount, 0))} sub="One like per trainer per comment" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold">Leave a review</h3>
          {!user ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground">
              <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to leave a review and like other trainers' comments.
            </div>
          ) : !profile ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground">
              Finish your <Link to="/auth" className="font-semibold text-primary hover:underline">trainer profile</Link> to post a review.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate this build</legend>
                  <p className="mt-1 text-sm text-muted-foreground">Your star rating is separate from your comment.</p>
                  <div className="mt-3 flex gap-1" role="group" aria-label="Choose a star rating">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const v = i + 1;
                      const active = (hover || rating || 0) >= v;
                      return (
                        <button
                          key={v} type="button"
                          onMouseEnter={() => setHover(v)} onMouseLeave={() => setHover(0)}
                          onClick={() => { setRating(v); playSoft(); }}
                          className={`grid h-11 w-11 place-items-center rounded-xl border p-1 transition-[background-color,border-color,transform] active:scale-95 ${
                            active ? "border-[var(--gold)]/70 bg-[var(--gold)]/10" : "border-border bg-background/30 hover:border-[var(--gold)]/50 hover:bg-[var(--gold)]/5"
                          }`} aria-label={`Rate ${v} star`} aria-pressed={rating === v}
                        >
                          <Star className={`h-7 w-7 transition-all ${active ? "scale-110 fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground"}`} />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button" disabled={rating === null || ratingBusy} onClick={submitRating} onMouseDown={playClick}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/50 px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-10px_var(--gold)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--gold), var(--primary))" }}
                  >
                    {ratingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    {ratingBusy ? "Submitting…" : rating ? `Submit ${rating}-star rating` : "Choose a star to rate"}
                  </button>
                </fieldset>
              </div>

              <form onSubmit={submitComment} className="rounded-2xl border border-border bg-background/20 p-4">
                <label htmlFor="review-body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leave a comment <span className="font-normal normal-case">(optional)</span></label>
                <textarea
                  id="review-body" name="comment"
                  value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your experience…" rows={4} maxLength={1000}
                  className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit" disabled={!body.trim() || commentBusy} onMouseDown={playClick}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] glow-primary disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}
                >
                  {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {commentBusy ? "Submitting…" : "Submit comment"}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold">What trainers are saying</h3>
          <div className="mt-5 space-y-4">
            {loading && (
              <p className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                Loading reviews…
              </p>
            )}
            {!loading && visibleComments.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                No reviews yet. Be the first to share your experience.
              </p>
            )}
            <AnimatePresence initial={false}>
              {visibleComments.map((c) => renderComment(c))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, sub, stars }: { label: string; value: string; sub: string; stars?: number }) {
  return (
    <div className="rounded-3xl glass p-6 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-5xl font-bold text-gradient">{value}</p>
      {typeof stars === "number" && (
                    <div className="mt-2 flex justify-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}`} />

          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
