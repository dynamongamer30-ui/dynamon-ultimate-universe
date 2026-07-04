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
import { useGamification } from "@/hooks/useGamification";
import { getAvatarUrl } from "@/lib/avatars";
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
  is_owner: boolean;
};

type LikeRow = { comment_id: string; user_id: string };

type EnrichedComment = CommentRow & {
  author?: AuthorRow;
  likeCount: number;
  likedByMe: boolean;
};

export function CommentsPanel({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { award, grant } = useGamification();
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
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
      supabase.from("profiles").select("id, username, display_name, avatar_url, is_owner").in("id", authorIds),
      supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds),
    ]);

    const authorMap = new Map<string, AuthorRow>((authors ?? []).map((a) => [a.id, a as AuthorRow]));
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) { toast.error("Sign in and complete your profile first"); return; }
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("comments").insert({
        mod_slug: slug, user_id: user.id, body: body.trim(), rating, parent_id: null,
      });
      if (error) throw error;
      setBody(""); setRating(5);
      playSuccess();
      toast.success("Review posted");
      award(15, "Reviewed");
      grant("first_review");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not post review");
    } finally {
      setBusy(false);
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
    if (!confirm("Delete this review?")) return;
    await supabase.from("comments").delete().eq("id", c.id);
    setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  };

  const renderComment = (c: EnrichedComment, isReply = false) => {
    const avatar = getAvatarUrl(c.author?.avatar_url);
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
                <p className="truncate text-sm font-semibold">{c.author?.display_name ?? "Trainer"}</p>
                {c.author?.is_owner && <OwnerBadge size="xs" />}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                @{c.author?.username ?? "trainer"} · {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {typeof c.rating === "number" && (
            <div className="flex shrink-0 gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < (c.rating ?? 0) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}`} />
              ))}
            </div>
          )}
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.body}</p>

        {!isReply && <div className="mt-3"><ElementalReactions commentId={c.id} /></div>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleLike(c)}
            className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors ${
              c.likedByMe ? "border-rose-400/40 text-rose-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${c.likedByMe ? "fill-rose-400" : ""}`} />
            {c.likeCount}
          </button>
          {!isReply && (
            <button
              onClick={() => { setReplyOpen(replyOpen === c.id ? null : c.id); setReplyBody(""); }}
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
              <textarea
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

  return (
    <section id="comments" className="mt-14 scroll-mt-24">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Community Rating" value={(avg || 0).toFixed(1)} sub={`${ratings.length} ratings`} stars={Math.round(avg)} />
        <StatCard label="Reviews" value={String(topLevel.length)} sub="Be helpful. Be honest." />
        <StatCard label="Likes" value={String(comments.reduce((s, c) => s + c.likeCount, 0))} sub="One like per trainer per comment" />
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
            <form onSubmit={submit} className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your rating</p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1;
                  const active = (hover || rating) >= v;
                  return (
                    <button
                      key={v} type="button"
                      onMouseEnter={() => setHover(v)} onMouseLeave={() => setHover(0)}
                      onClick={() => { setRating(v); playSoft(); }}
                      className="p-1" aria-label={`Rate ${v} star`}
                    >
                      <Star className={`h-7 w-7 transition-all ${active ? "fill-[var(--gold)] text-[var(--gold)] scale-110" : "text-muted-foreground"}`} />
                    </button>
                  );
                })}
              </div>
              <textarea
                value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Share your experience…" rows={4} maxLength={1000}
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit" disabled={busy} onMouseDown={playClick}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] glow-primary disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post review
              </button>
            </form>
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
            {!loading && topLevel.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                No reviews yet. Be the first to share your experience.
              </p>
            )}
            <AnimatePresence initial={false}>
              {topLevel.map((c) => renderComment(c))}
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
        <div className="mt-2 flex justify-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"}`} />
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
