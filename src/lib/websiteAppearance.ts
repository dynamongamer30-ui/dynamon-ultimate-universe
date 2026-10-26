import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { WEBSITE_APPEARANCE_KEY, type WebsiteAppearance } from "./websiteThemes";

/** Snapshot comparison preserves a newer owner's published settings. RLS still authorizes the write. */
export async function publishWebsiteAppearance(
  config: WebsiteAppearance,
  expected: unknown,
  signal: AbortSignal = AbortSignal.timeout(10000),
) {
  const value = config as unknown as Json;
  const query =
    expected === undefined
      ? supabase.from("site_settings").insert({ key: WEBSITE_APPEARANCE_KEY, value })
      : supabase
          .from("site_settings")
          .update({ value })
          .eq("key", WEBSITE_APPEARANCE_KEY)
          .eq("value", JSON.stringify(expected));
  const { data, error } = await query.select("key").abortSignal(signal).maybeSingle().retry(false);
  if (signal.aborted)
    throw new Error("Appearance publication was not confirmed. Reload before trying again.");
  if (error) throw new Error(error.message);
  if (data?.key !== WEBSITE_APPEARANCE_KEY)
    throw new Error(
      "Appearance changed in another session or publication was not confirmed. Reload before saving.",
    );
}
