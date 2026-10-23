export const REVIEW_PAGE_SIZE = 10;
export const REPLY_PAGE_SIZE = 5;
export type CommunityAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  custom_avatar_url: string | null;
  is_owner: boolean;
};
export type CommunityComment = {
  id: string;
  mod_slug: string;
  user_id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  author?: CommunityAuthor;
  likeCount: number;
  likedByMe: boolean;
};
export type ReviewThread = CommunityComment & { replyCount: number; replies: CommunityComment[] };
export type ReviewPage = {
  page: number;
  totalThreads: number;
  reviewLikeCount: number;
  ratingCount: number;
  ratingSum: number;
  threads: ReviewThread[];
};
export type ReplyPage = { total: number; replies: CommunityComment[]; hasMore: boolean };
const invalid = () => {
  throw new Error("Community response was incomplete. Please retry.");
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
const text = (value: unknown): string => (typeof value === "string" ? value : invalid());
const count = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalid();
const flag = (value: unknown): boolean => (typeof value === "boolean" ? value : invalid());
const list = (value: unknown, max: number): unknown[] =>
  Array.isArray(value) && value.length <= max ? value : invalid();
const nullableText = (value: unknown): string | null => (value === null ? null : text(value));
function comment(value: unknown, slug?: string, parent?: string | null): CommunityComment {
  const row = object(value);
  const mod_slug = text(row.mod_slug),
    parent_id = nullableText(row.parent_id);
  if ((slug !== undefined && mod_slug !== slug) || (parent !== undefined && parent_id !== parent))
    return invalid();
  const created_at = text(row.created_at);
  if (!Number.isFinite(Date.parse(created_at))) return invalid();
  const author = row.author == null ? undefined : object(row.author);
  return {
    id: text(row.id),
    mod_slug,
    user_id: text(row.user_id),
    body: text(row.body),
    created_at,
    parent_id,
    likeCount: count(row.likeCount),
    likedByMe: flag(row.likedByMe),
    author: author
      ? {
          id: text(author.id),
          username: nullableText(author.username),
          display_name: nullableText(author.display_name),
          avatar_url: nullableText(author.avatar_url),
          custom_avatar_url: nullableText(author.custom_avatar_url),
          is_owner: author.is_owner === null ? false : flag(author.is_owner),
        }
      : undefined,
  };
}
export function parseReviewPage(value: unknown, slug: string): ReviewPage {
  const row = object(value);
  const page = count(row.page),
    totalThreads = count(row.totalThreads);
  if (page > Math.max(0, Math.ceil(totalThreads / REVIEW_PAGE_SIZE) - 1)) return invalid();
  const threads = list(row.threads, REVIEW_PAGE_SIZE).map((value) => {
    const thread = object(value);
    const root = comment(thread, slug, null);
    const replies = list(thread.replies, REPLY_PAGE_SIZE).map((reply) =>
      comment(reply, slug, root.id),
    );
    const replyCount = count(thread.replyCount);
    if (replyCount < replies.length) return invalid();
    return { ...root, replyCount, replies };
  });
  if (threads.length !== Math.min(REVIEW_PAGE_SIZE, totalThreads - page * REVIEW_PAGE_SIZE))
    return invalid();
  const ratingCount = count(row.ratingCount),
    ratingSum = count(row.ratingSum);
  if (ratingSum < ratingCount || ratingSum > ratingCount * 5) return invalid();
  return {
    page,
    totalThreads,
    threads,
    ratingCount,
    ratingSum,
    reviewLikeCount: count(row.reviewLikeCount),
  };
}
export function parseReplyPage(value: unknown, parent: string, slug: string): ReplyPage {
  const row = object(value);
  const replies = list(row.replies, REPLY_PAGE_SIZE).map((reply) => comment(reply, slug, parent));
  const total = count(row.total);
  if (total < replies.length) return invalid();
  return { total, replies, hasMore: flag(row.hasMore) };
}
