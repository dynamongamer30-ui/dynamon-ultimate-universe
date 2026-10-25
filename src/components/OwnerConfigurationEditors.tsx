import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";
import { Button } from "@/components/ui/button";

const timingDefaults = { timer: 900, minTimer: 45 };
const accountDefaults = { enabled: true };
type Timing = typeof timingDefaults;
const validTiming = (value: Timing) =>
  Number.isSafeInteger(value.timer) &&
  Number.isSafeInteger(value.minTimer) &&
  value.minTimer >= 0 &&
  value.timer > value.minTimer;
const validAccount = (value: typeof accountDefaults) => typeof value.enabled === "boolean";
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2";

function useConfiguration<T extends object>(id: string, defaults: T, valid: (value: T) => boolean) {
  const resource = useOwnerResource(
    useCallback(
      async (signal: AbortSignal) => {
        const { data, error } = await supabase
          .from("app_config")
          .select("data")
          .eq("id", id)
          .abortSignal(signal)
          .maybeSingle()
          .retry(false);
        if (signal.aborted || error) throw new Error("Configuration lookup failed");
        if (data?.data != null && (typeof data.data !== "object" || Array.isArray(data.data)))
          throw new Error("Saved configuration is invalid");
        const value =
          data?.data == null ? defaults : { ...defaults, ...(data.data as unknown as T) };
        if (!valid(value)) throw new Error("Saved configuration is invalid");
        return { value, exists: !!data };
      },
      [id, defaults, valid],
    ),
  );
  const [draft, setDraft] = useState<T | null>(null);
  useEffect(() => {
    if (resource.data) setDraft(resource.data.value);
  }, [resource.data]);
  const mutation = useOwnerMutation();
  const save = () =>
    mutation.run(async (signal) => {
      if (!draft || resource.loading || resource.error) return;
      if (!valid(draft)) throw new Error("Use valid values before saving. Your draft is retained.");
      const { data, error } = await supabase
        .from("app_config")
        .upsert({ id, data: draft as never })
        .select("id")
        .abortSignal(signal)
        .maybeSingle()
        .retry(false);
      if (signal.aborted) throw new Error("Configuration save was not confirmed");
      if (error) throw new Error(error.message);
      if (data?.id !== id)
        throw new Error("Configuration save was not confirmed. Your draft is retained.");
      toast.success("Configuration saved");
    });
  return {
    resource,
    draft,
    setDraft,
    mutation,
    save,
    blocked: !draft || resource.loading || !!resource.error || mutation.saving,
  };
}

export function OwnerTimingEditor() {
  const state = useConfiguration("Security", timingDefaults, validTiming);
  return (
    <section
      aria-labelledby="timing-title"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="timing-title" className="text-xl font-bold">
        Unlock timing
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Minimum and maximum valid session times in seconds. These are the existing unlock settings.
      </p>
      {state.resource.loading && <p role="status">Loading unlock timing…</p>}
      {state.resource.error && (
        <div role="alert">
          <p>{state.resource.error}</p>
          <Button
            variant="outline"
            onClick={state.resource.reload}
            disabled={state.resource.loading}
          >
            Retry unlock timing
          </Button>
        </div>
      )}
      {state.mutation.error && (
        <p role="alert" className="mt-3 break-words text-destructive">
          {state.mutation.error}
        </p>
      )}
      {state.resource.data && !state.resource.data.exists && (
        <p className="mt-3 text-sm">No saved override. Showing the existing default values.</p>
      )}
      <fieldset
        disabled={state.blocked}
        aria-busy={state.mutation.saving}
        className="mt-4 min-w-0 space-y-4"
      >
        <legend className="sr-only">Unlock timing settings</legend>
        <label className="block text-sm">
          Minimum time (seconds)
          <input
            type="number"
            min={0}
            step={1}
            className={input}
            value={state.draft?.minTimer ?? ""}
            onChange={(event) =>
              state.setDraft((draft) => draft && { ...draft, minTimer: Number(event.target.value) })
            }
          />
        </label>
        <label className="block text-sm">
          Maximum time (seconds)
          <input
            type="number"
            min={1}
            step={1}
            className={input}
            value={state.draft?.timer ?? ""}
            onChange={(event) =>
              state.setDraft((draft) => draft && { ...draft, timer: Number(event.target.value) })
            }
          />
        </label>
        {state.draft && !validTiming(state.draft) && (
          <p className="text-sm text-destructive">
            Use non-negative whole seconds, with minimum less than maximum.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => state.setDraft(timingDefaults)}>
            Reset defaults
          </Button>
          <Button onClick={() => void state.save()}>Save unlock timing</Button>
        </div>
      </fieldset>
    </section>
  );
}

async function readAccountStats(signal: AbortSignal) {
  const { data, error } = await supabase
    .rpc("admin_account_stats" as never)
    .abortSignal(signal)
    .retry(false);
  if (error || !Array.isArray(data)) throw new Error("Stats lookup failed");
  const row = data[0] as { total_users?: unknown; inactive_30d?: unknown } | undefined;
  if (!row || !Number.isSafeInteger(row.total_users) || !Number.isSafeInteger(row.inactive_30d))
    throw new Error("Stats unavailable");
  return { total: Number(row.total_users), inactive: Number(row.inactive_30d) };
}

export function OwnerAccountsEditor() {
  const state = useConfiguration("AccountDeletion", accountDefaults, validAccount);
  const stats = useOwnerResource(readAccountStats);
  return (
    <section
      aria-labelledby="account-management-title"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="account-management-title" className="text-xl font-bold">
        Accounts
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Control the existing inactive-account cleanup setting.
      </p>
      <p className="mt-3 text-sm">
        Total signed-up users:{" "}
        {stats.loading || stats.error ? "Unavailable" : (stats.data?.total ?? "Unavailable")} ·
        Inactive 30+ days:{" "}
        {stats.loading || stats.error ? "Unavailable" : (stats.data?.inactive ?? "Unavailable")}
      </p>
      {stats.error && (
        <Button variant="outline" disabled={stats.loading} onClick={stats.reload}>
          Retry account counts
        </Button>
      )}
      {state.resource.loading && <p role="status">Loading account configuration…</p>}
      {state.resource.error && (
        <div role="alert">
          <p>{state.resource.error}</p>
          <Button
            variant="outline"
            disabled={state.resource.loading}
            onClick={state.resource.reload}
          >
            Retry account configuration
          </Button>
        </div>
      )}
      {state.mutation.error && (
        <p role="alert" className="mt-3 break-words text-destructive">
          {state.mutation.error}
        </p>
      )}
      <fieldset
        disabled={state.blocked}
        aria-busy={state.mutation.saving}
        className="mt-4 min-w-0 space-y-4"
      >
        <legend className="sr-only">Inactive-account cleanup</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={state.draft?.enabled ?? false}
            onChange={(event) => state.setDraft({ enabled: event.target.checked })}
          />
          Auto-delete inactive accounts
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={state.resource.reload}>
            Reload saved setting
          </Button>
          <Button onClick={() => void state.save()}>Save account setting</Button>
        </div>
      </fieldset>
    </section>
  );
}
