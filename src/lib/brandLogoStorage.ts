import type { supabase } from "@/integrations/supabase/client";

export const MAX_BRAND_LOGO_BYTES = 15 * 1024 * 1024;

/** Delete only this owner's managed uploads after checking saved branding references. */
export async function removeUnusedBrandLogo(
  client: typeof supabase,
  previous: string,
  owner: string,
) {
  const marker = "/storage/v1/object/public/avatars/";
  const canonical = new URL(
    client.storage.from("avatars").getPublicUrl("branding/").data.publicUrl,
  );
  let candidate: URL;
  try {
    candidate = new URL(previous);
  } catch {
    return;
  }
  const object = candidate.pathname.startsWith(marker)
    ? decodeURIComponent(candidate.pathname.slice(marker.length))
    : "";
  if (
    candidate.origin !== canonical.origin ||
    !object.startsWith(`branding/${owner}/`) ||
    object.includes("..")
  )
    return;
  const { data, error } = await client
    .from("site_settings")
    .select("value")
    .eq("key", "branding")
    .single();
  if (error || !data) throw Error("Could not confirm saved branding before cleanup.");
  const referenced = (value: unknown): boolean => {
    if (typeof value === "string") {
      try {
        const url = new URL(value);
        return url.origin === candidate.origin && url.pathname === candidate.pathname;
      } catch {
        return false;
      }
    }
    return !!value && typeof value === "object" && Object.values(value).some(referenced);
  };
  if (referenced(data.value)) return;
  const { error: removalError } = await client.storage.from("avatars").remove([object]);
  if (removalError) throw Error("The previous logo could not be removed.");
}
