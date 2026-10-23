export const REACTION_KEYS = ["fire", "water", "thunder", "leaf", "spirit"] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];
export type ReactionRow = { reaction: ReactionKey; count: number; mine: boolean };
export type ReactionCounts = ReactionRow & { comment_id: string };

export function parseReactionCounts(value: unknown, ids: string[]): ReactionCounts[] {
  const allowed = new Set(ids);
  if (!Array.isArray(value) || value.length > allowed.size * REACTION_KEYS.length)
    throw new Error("Reaction counts were incomplete");
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Reaction counts were incomplete");
    const row = raw as Record<string, unknown>;
    const key = `${row.comment_id}:${row.reaction}`;
    if (
      typeof row.comment_id !== "string" ||
      !allowed.has(row.comment_id) ||
      !REACTION_KEYS.includes(row.reaction as ReactionKey) ||
      typeof row.total !== "number" ||
      !Number.isSafeInteger(row.total) ||
      row.total < 1 ||
      typeof row.mine !== "boolean" ||
      seen.has(key)
    )
      throw new Error("Reaction counts were incomplete");
    seen.add(key);
    return {
      comment_id: row.comment_id,
      reaction: row.reaction as ReactionKey,
      count: row.total,
      mine: row.mine,
    };
  });
}

/** Change only this caller's contribution; repeated settlement/rollback is idempotent. */
export function setOwnReaction(
  rows: ReactionRow[],
  reaction: ReactionKey,
  mine: boolean,
): ReactionRow[] {
  const current = rows.find((row) => row.reaction === reaction);
  if (!!current?.mine === mine) return rows;
  const count = Math.max(0, (current?.count ?? 0) + (mine ? 1 : -1));
  const rest = rows.filter((row) => row.reaction !== reaction);
  return count ? [...rest, { reaction, count, mine }] : rest;
}
