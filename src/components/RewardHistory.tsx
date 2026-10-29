import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { featureRpc } from "@/lib/featureRpc";
type Reward = {
  id: string;
  kind: string;
  label: string;
  awarded_at: string;
  expires_at: string;
  claimed: boolean;
  key_code: string | null;
  claim_ref: string;
  claim_kind: "daily_key" | "phoenix_pass" | "granted_key";
};
type History = { items: Reward[]; server_time: string };
export function RewardHistory() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [before, setBefore] = useState<{ at: string; id: string } | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [received, setReceived] = useState(Date.now());
  const q = useQuery({
    queryKey: ["reward-history", user?.id, before],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      const data = await featureRpc<History>(
        "website_reward_history",
        { p_before: before?.at ?? null, p_before_id: before?.id ?? null, p_limit: 20 },
        signal,
      );
      if (
        !data ||
        !Array.isArray(data.items) ||
        !Number.isFinite(Date.parse(data.server_time)) ||
        data.items.some(
          (r) =>
            typeof r.id !== "string" ||
            typeof r.label !== "string" ||
            !Number.isFinite(Date.parse(r.awarded_at)) ||
            !Number.isFinite(Date.parse(r.expires_at)) ||
            typeof r.claimed !== "boolean" ||
            (r.key_code !== null && typeof r.key_code !== "string") ||
            !["daily_key", "phoenix_pass", "granted_key"].includes(r.claim_kind),
        )
      )
        throw Error("Reward details could not be read. Retry loading.");
      return data;
    },
    gcTime: 0,
    staleTime: 30000,
    retry: false,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    setReceived(Date.now());
    setNow(Date.now());
  }, [q.data]);
  useEffect(() => {
    setBefore(null);
    setRevealed([]);
    setMessage("");
  }, [user?.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const serverNow = q.data ? Date.parse(q.data.server_time) + Math.max(0, now - received) : now;
  const rows = (q.data?.items ?? []).filter((r) => Date.parse(r.expires_at) > serverNow);
  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setMessage("Key copied. Copying does not activate it.");
    } catch {
      setMessage("Clipboard unavailable. Select the visible key and copy it manually.");
    }
  };
  return (
    <section
      id="my-rewards"
      className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7"
      aria-labelledby="reward-history-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary-ink">Your reward vault</p>
          <h2 id="reward-history-title" className="mt-2 font-display text-2xl font-bold">
            My Rewards
          </h2>
        </div>
        <Link to="/help" hash="history" className="touch-target text-sm underline">
          How rewards work
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Eligible rewards stay here even when their notifications disappear. Used and expired items
        leave this list; existing claim deadlines still apply.
      </p>
      {!user ? (
        <Link
          to="/auth"
          className="touch-target mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Sign in to see your rewards
        </Link>
      ) : q.isPending ? (
        <p role="status" className="mt-5">
          Loading your rewards…
        </p>
      ) : q.error ? (
        <div role="alert" className="mt-5">
          <p>{q.error.message}</p>
          <button className="touch-target mt-2 underline" onClick={() => void q.refetch()}>
            Retry rewards
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="mt-4 text-xs text-muted-foreground">
            {message}
          </p>
          {!rows.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No available rewards on this page. Check the daily rewards and trainer levels below.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="min-w-0 rounded-xl border border-border bg-background/40 p-4"
                >
                  <p className="font-bold">{r.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.claimed ? "Available" : "Claim required"} ·{" "}
                    {r.kind === "granted_key"
                      ? "Trainer reward"
                      : r.kind === "daily_key"
                        ? "Daily giveaway"
                        : "Phoenix Pass"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.claimed ? "Expires" : "Claim by"} {new Date(r.expires_at).toLocaleString()}
                  </p>
                  {r.key_code ? (
                    <>
                      <button
                        onClick={() =>
                          setRevealed((v) =>
                            v.includes(r.id) ? v.filter((id) => id !== r.id) : [...v, r.id],
                          )
                        }
                        className="touch-target mt-3 text-sm underline"
                      >
                        {revealed.includes(r.id) ? "Hide key" : "Reveal key"}
                      </button>
                      {revealed.includes(r.id) && (
                        <div>
                          <code className="mt-2 block select-all break-all rounded-lg border border-border p-3 text-sm">
                            {r.key_code}
                          </code>
                          <button
                            className="touch-target mt-2 rounded-lg border border-border px-3 text-sm"
                            onClick={() => void copy(r.key_code!)}
                          >
                            Copy key
                          </button>
                        </div>
                      )}
                    </>
                  ) : r.claimed ? (
                    <Link
                      to="/mods"
                      className="touch-target mt-3 inline-flex rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      Choose a build
                    </Link>
                  ) : (
                    <Link
                      to="/claim"
                      search={{ kind: r.claim_kind, ref: r.claim_ref, label: "" }}
                      className="touch-target mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Claim reward
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {before && (
              <button
                className="touch-target rounded-lg border border-border px-3 text-sm"
                onClick={() => setBefore(null)}
              >
                Newest rewards
              </button>
            )}
            {(q.data?.items.length ?? 0) === 20 && (
              <button
                className="touch-target rounded-lg border border-border px-3 text-sm"
                onClick={() =>
                  setBefore({ at: q.data!.items.at(-1)!.awarded_at, id: q.data!.items.at(-1)!.id })
                }
              >
                Older rewards
              </button>
            )}
            <button
              className="touch-target rounded-lg border border-border px-3 text-sm"
              onClick={() => {
                setRevealed([]);
                void client.invalidateQueries({ queryKey: ["reward-history", user.id] });
              }}
            >
              Refresh rewards
            </button>
          </div>
        </>
      )}
    </section>
  );
}
