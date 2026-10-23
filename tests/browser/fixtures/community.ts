type Comment = {
  id: string;
  mod_slug: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};
type Author = {
  id: string;
  username: string;
  display_name: string;
  is_owner: boolean;
  avatar_url?: string | null;
  custom_avatar_url?: string | null;
};
type Like = { comment_id: string; user_id: string };
export function fixtureReviewPage(
  comments: Comment[],
  authors: Author[],
  likes: Like[],
  slug: string,
  requested = 0,
  user?: string,
) {
  const scoped = comments.filter((c) => c.mod_slug === slug);
  const enrich = (c: Comment) => {
    const author = authors.find((a) => a.id === c.user_id);
    return {
      ...c,
      author: author
        ? {
            ...author,
            avatar_url: author.avatar_url ?? null,
            custom_avatar_url: author.custom_avatar_url ?? null,
          }
        : null,
      likeCount: likes.filter((l) => l.comment_id === c.id).length,
      likedByMe: likes.some((l) => l.comment_id === c.id && l.user_id === user),
    };
  };
  const roots = scoped
    .filter((c) => !c.parent_id && c.body.trim())
    .map(enrich)
    .sort((a, b) => {
      const owner = Number(!!b.author?.is_owner) - Number(!!a.author?.is_owner);
      return (
        owner ||
        (a.author?.is_owner ? 0 : b.likeCount - a.likeCount) ||
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id.localeCompare(a.id)
      );
    });
  const page = Math.min(requested, Math.max(0, Math.ceil(roots.length / 10) - 1));
  return {
    page,
    totalThreads: roots.length,
    reviewLikeCount: likes.filter((l) => scoped.some((c) => c.id === l.comment_id)).length,
    ratingCount: 0,
    ratingSum: 0,
    threads: roots.slice(page * 10, page * 10 + 10).map((root) => {
      const replies = scoped
        .filter((c) => c.parent_id === root.id)
        .sort(
          (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
        );
      return { ...root, replyCount: replies.length, replies: replies.slice(0, 5).map(enrich) };
    }),
  };
}
