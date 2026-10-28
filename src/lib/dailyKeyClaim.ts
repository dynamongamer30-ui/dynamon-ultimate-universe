/** Notifications historically carry a key string; the claim RPC requires its UUID. */
export async function resolveDailyKeyClaimId(
  reference: string,
  load: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<string | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference))
    return reference;
  if (!/^(?:DG|VIP|DGVIP)-[A-Z0-9]{6,16}$/.test(reference)) return null;
  const { data, error } = await load();
  if (error) throw new Error("Reward lookup unavailable");
  if (!Array.isArray(data)) return null;
  const row = data.find((item) => item?.key === reference);
  return typeof row?.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)
    ? row.id
    : null;
}
