import { supabase } from "@/integrations/supabase/client";

export async function readOwnerConfig(ids: string[], signal: AbortSignal) {
  const { data, error } = await supabase
    .from("app_config")
    .select("id,data")
    .in("id", ids)
    .abortSignal(signal)
    .retry(false);
  if (signal.aborted || error || !Array.isArray(data))
    throw new Error("Could not load saved app settings.");
  if (data.some((row) => typeof row.id !== "string" || !ids.includes(row.id)))
    throw new Error("Invalid app settings response.");
  return Object.fromEntries(data.map((row) => [row.id, row.data])) as Record<string, unknown>;
}

/** Compare the originally loaded JSON inside the write, under the existing RLS. */
export async function saveOwnerSetting(
  table: "site_settings" | "app_config",
  id: string,
  value: unknown,
  expected: unknown,
  signal: AbortSignal,
) {
  const identity = table === "site_settings" ? "key" : "id";
  const column = table === "site_settings" ? "value" : "data";
  const client = supabase.from(table);
  const query =
    expected === undefined
      ? client.insert({ [identity]: id, [column]: value } as never)
      : client.update({ [column]: value } as never).filter(identity, "eq", id);
  const guarded =
    expected === undefined
      ? query
      : expected === null
        ? query.filter(column, "is", null)
        : query.filter(column, "eq", JSON.stringify(expected));
  const { data, error } = await guarded
    .select(identity)
    .abortSignal(signal)
    .maybeSingle()
    .retry(false);
  if (signal.aborted) throw new Error("Save was not confirmed. Your draft is retained.");
  if (error) {
    if (error.code === "23505")
      throw new Error(
        "Settings changed in another session. Reload before saving. Your draft is retained.",
      );
    throw new Error(error.message);
  }
  if ((data as unknown as Record<string, unknown> | null)?.[identity] !== id)
    throw new Error(
      "Save was not confirmed. Settings may have changed in another session. Reload before saving. Your draft is retained.",
    );
}

const modFields = [
  "name",
  "tagline",
  "description",
  "version",
  "size",
  "updated_date",
  "youtube_id",
  "features",
  "changelog",
  "downloads_absolute",
  "likes_absolute",
  "seed_rating_points",
  "seed_rating_count",
  "seed_review_likes",
  "download_url",
  "mega_enc",
  "follow_enc",
  "hidden",
  "featured",
] as const;

/** Match edited fields, allowing independent download counters to continue changing. */
export async function writeOwnerMod(
  slug: string,
  payload: Record<string, unknown> | null,
  expected: Record<string, unknown> | undefined,
  signal: AbortSignal,
) {
  if (!payload && !expected) throw new Error("No saved override to reset. Reload the mod first.");
  const client = supabase.from("mod_overrides");
  let query = payload
    ? expected
      ? client.update(payload as never).eq("slug", slug)
      : client.insert({ ...payload, slug } as never)
    : client.delete().eq("slug", slug);
  if (expected)
    for (const key of modFields) {
      const value = expected[key] ?? null;
      query = query.filter(
        key,
        value === null ? "is" : "eq",
        value !== null && typeof value === "object" ? JSON.stringify(value) : value,
      );
    }
  const { data, error } = await query.select("slug").abortSignal(signal).maybeSingle().retry(false);
  const action = payload ? "Mod save" : "Reset";
  if (signal.aborted) throw new Error(`${action} was not confirmed. Your draft is retained.`);
  if (error && error.code !== "23505") throw new Error(error.message);
  if (error || data?.slug !== slug)
    throw new Error(
      `${action} was not confirmed. The mod may have changed in another session. Reload before saving. Your draft is retained.`,
    );
}
