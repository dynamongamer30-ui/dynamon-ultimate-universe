import { supabase } from "@/integrations/supabase/client";

export async function featureRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const deadline = AbortSignal.timeout(12000);
  const { data, error } = await supabase
    .rpc(name as never, args as never)
    .abortSignal(signal ? AbortSignal.any([signal, deadline]) : deadline)
    .retry(false);
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "This feature is awaiting its server update. Your existing data is unchanged."
        : error.message,
    );
  return data as T;
}
