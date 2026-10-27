export async function checkAppPolicy(env, version) {
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) throw Error("Policy unavailable");
  const response = await fetch(
    base + "/rest/v1/app_config?select=id,data&id=in.(Maintenance,Update)",
    { headers: { apikey: env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw Error("Policy unavailable");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw Error("Invalid policy");
  const values = Object.fromEntries(rows.map((r) => [r.id, r.data]));
  if (values.Maintenance === true) return { status: 503, error: "maintenance" };
  const update = values.Update;
  const installed = Number.isSafeInteger(version) && version >= 0 ? version : 0;
  if (
    update?.Enabled === true &&
    update.Force === true &&
    Number.isSafeInteger(update.VersionCode) &&
    update.VersionCode > installed
  )
    return { status: 426, error: "update_required" };
  return null;
}
