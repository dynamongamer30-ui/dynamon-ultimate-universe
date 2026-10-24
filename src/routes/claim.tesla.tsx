import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Feather, Gift, Loader2, Sparkles, ArrowRight, CheckCircle2, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { playClick } from "@/lib/sound";
import { toast } from "sonner";

export const Route = createFileRoute("/claim/tesla")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Claim a Tesla Phoenix Pass — Dynamon Universe" },
      { name: "description", content: "Claim one of the first 100 Tesla campaign Phoenix Passes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TeslaClaimPage,
});

type ClaimState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "claimed"; expiresAt?: string; count?: number; max?: number; already?: boolean }
  | { kind: "error"; message: string; uncertain: boolean };

function TeslaClaimPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const current = useRef(userId);
  current.current = userId;
  return (
    <TeslaClaimSession
      key={userId ?? "signed-out"}
      userId={userId}
      authLoading={authLoading}
      isCurrent={() => current.current === userId}
    />
  );
}

function TeslaClaimSession({
  userId,
  authLoading,
  isCurrent,
}: {
  userId: string | null;
  authLoading: boolean;
  isCurrent: () => boolean;
}) {
  const navigate = useNavigate();
  const started = useRef(false);
  const pending = useRef(false);
  const active = useRef(true);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const current = useRef(isCurrent);
  current.current = isCurrent;
  const [state, setState] = useState<ClaimState>({ kind: "idle" });
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      request.current?.abort();
    };
  }, []);

  const signIn = async () => {
    playClick();
    try {
      sessionStorage.setItem("dg_after_auth", "/claim/tesla");
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    await navigate({ to: "/auth" });
  };

  const claim = useCallback(async () => {
    if (!userId || !active.current || !current.current() || pending.current) return;
    pending.current = true;
    const version = ++generation.current;
    const valid = () => active.current && current.current() && generation.current === version;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    const uncertain = () =>
      setState({
        kind: "error",
        uncertain: true,
        message:
          "We couldn't confirm the result. Your pass may already have been claimed. Check Rewards, or check this campaign again to confirm or complete your claim.",
      });
    setState({ kind: "loading" });
    try {
      const { data, error } = await supabase
        .rpc("claim_campaign_pass", { p_campaign_slug: "tesla" })
        .abortSignal(controller.signal)
        .retry(false);
      if (!valid()) return;
      if (error || !data || typeof data !== "object" || Array.isArray(data))
        throw new Error("unconfirmed");
      const result = data as {
        ok?: boolean;
        error?: string;
        expires_at?: string;
        claimed_count?: number;
        max_claims?: number;
        pass_id?: string;
      } | null;
      if (result?.ok === true) {
        if (
          typeof result.pass_id !== "string" ||
          !result.pass_id ||
          typeof result.expires_at !== "string" ||
          !Number.isFinite(Date.parse(result.expires_at)) ||
          Date.parse(result.expires_at) <= Date.now()
        )
          throw new Error("unconfirmed");
        const countsValid =
          Number.isInteger(result.claimed_count) &&
          Number.isInteger(result.max_claims) &&
          result.claimed_count! > 0 &&
          result.max_claims! >= result.claimed_count!;
        setState({
          kind: "claimed",
          expiresAt: result.expires_at,
          count: countsValid ? result.claimed_count : undefined,
          max: countsValid ? result.max_claims : undefined,
        });
        toast.success("Tesla Phoenix Pass claimed");
        return;
      }
      if (result?.ok === false && result.error === "already_claimed") {
        setState({
          kind: "claimed",
          expiresAt:
            typeof result.expires_at === "string" && Number.isFinite(Date.parse(result.expires_at))
              ? result.expires_at
              : undefined,
          already: true,
        });
        return;
      }
      if (result?.ok === false && result.error === "sold_out") {
        setState({
          kind: "error",
          message: "All passes in this campaign have already been claimed.",
          uncertain: false,
        });
        return;
      }
      if (
        result?.ok === false &&
        ["campaign_inactive", "not_authenticated"].includes(result.error || "")
      ) {
        setState({
          kind: "error",
          uncertain: false,
          message:
            result.error === "not_authenticated"
              ? "Your sign-in couldn't be verified. Please sign out and sign in again before claiming."
              : "This campaign is not currently available.",
        });
      } else uncertain();
    } catch {
      if (valid()) uncertain();
    } finally {
      clearTimeout(timer);
      if (generation.current === version) pending.current = false;
    }
  }, [userId]);

  useEffect(() => {
    let disposed = false;
    // Defer until effect setup settles so disposed mounts cannot start a claim.
    queueMicrotask(() => {
      if (!disposed && !authLoading && userId && !started.current) {
        started.current = true;
        void claim();
      }
    });
    return () => {
      disposed = true;
    };
  }, [authLoading, userId, claim]);

  return (
    <PageShell>
      <section className="route-hero edge-light relative overflow-hidden rounded-2xl glass p-8 text-center sm:p-14">
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-300">
          <Gift className="h-4 w-4" /> Limited campaign
        </p>
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">
          Tesla <span className="text-gradient">Phoenix Pass</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          One free Phoenix Pass for each Google account. Only the first 100 accounts can claim one.
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-xl">
        {authLoading || state.kind === "loading" || (userId && state.kind === "idle") ? (
          <StatusCard
            icon={<Loader2 className="h-8 w-8 animate-spin" />}
            title="Checking your claim…"
            text="Please keep this page open for a moment."
          />
        ) : !userId ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-8 text-center">
            <Feather className="mx-auto h-9 w-9 text-amber-300" />
            <h2 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-tight">
              Sign in to claim
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use Google to securely connect this claim to your account. You can claim only once.
            </p>
            <button
              type="button"
              onClick={signIn}
              className="touch-target press mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition hover:brightness-110"
            >
              Continue with Google <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : state.kind === "claimed" ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-8 text-center"
          >
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-tight">
              {state.already ? "Already claimed" : "Claim successful"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.already
                ? "This account has already claimed its Tesla Phoenix Pass. Check Rewards for its current availability."
                : "Your Tesla Phoenix Pass is now active in your account."}
            </p>
            {state.expiresAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                {state.already ? "Recorded expiry" : "Valid until"}{" "}
                {new Date(state.expiresAt).toLocaleDateString()}.
              </p>
            )}
            {state.count && state.max && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                <Users className="h-3.5 w-3.5" /> {state.count} of {state.max} claimed
              </p>
            )}
            <Link
              to="/mods"
              onMouseDown={playClick}
              className="touch-target press mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 transition hover:brightness-110"
            >
              Pick a mod <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/rewards"
              className="touch-target mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold"
            >
              Check Rewards
            </Link>
          </motion.div>
        ) : state.kind === "error" ? (
          <StatusCard
            icon={<Sparkles className="h-8 w-8 text-amber-300" />}
            title={state.uncertain ? "Claim not confirmed" : "Campaign unavailable"}
            text={state.message}
            error
            actions={
              <>
                {state.uncertain && (
                  <button
                    type="button"
                    onClick={() => void claim()}
                    className="touch-target mt-5 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold"
                  >
                    Check claim again
                  </button>
                )}
                <Link
                  to="/rewards"
                  className="touch-target mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold"
                >
                  Check Rewards
                </Link>
              </>
            }
          />
        ) : null}
      </div>
    </PageShell>
  );
}

function StatusCard({
  icon,
  title,
  text,
  error = false,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  error?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
      {icon}
      <h2 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight">{title}</h2>
      <p role={error ? "alert" : "status"} className="mt-2 text-sm text-muted-foreground">
        {text}
      </p>
      {actions}
    </div>
  );
}
