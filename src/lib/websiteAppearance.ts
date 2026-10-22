import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { WEBSITE_APPEARANCE_KEY, type WebsiteAppearance } from "./websiteThemes";

/** Snapshot comparison preserves a newer owner's published settings. RLS still authorizes the write. */
export async function publishWebsiteAppearance(config: WebsiteAppearance, expected: unknown) {
  const value = config as unknown as Json;
  const query =
    expected === undefined
      ? supabase.from("site_settings").insert({ key: WEBSITE_APPEARANCE_KEY, value })
      : supabase
          .from("site_settings")
          .update({ value })
          .eq("key", WEBSITE_APPEARANCE_KEY)
          .eq("value", JSON.stringify(expected));
  const { data, error } = await query.select("key").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Appearance changed in another session. Reload before saving.");
}
