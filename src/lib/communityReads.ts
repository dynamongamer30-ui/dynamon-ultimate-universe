export const REVIEW_PAGE_SIZE = 10;
export const COMMUNITY_ROW_BATCH = 500;
const ID_BATCH = 100;

type Result<T> = { data: T[] | null; error: unknown };

/** Complete a snapshot without relying on the API's default maximum row count. */
export async function readCommunityRows<T>(
  read: (from: number, to: number) => PromiseLike<Result<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += COMMUNITY_ROW_BATCH) {
    const { data, error } = await read(from, from + COMMUNITY_ROW_BATCH - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < COMMUNITY_ROW_BATCH) return rows;
  }
}

/** Bound IN-filter URL size as well as response size. */
export async function readCommunityIds<T>(
  ids: string[],
  read: (ids: string[], from: number, to: number) => PromiseLike<Result<T>>,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  const rows: T[] = [];
  for (let index = 0; index < unique.length; index += ID_BATCH) {
    const group = unique.slice(index, index + ID_BATCH);
    rows.push(...(await readCommunityRows((from, to) => read(group, from, to))));
  }
  return rows;
}
