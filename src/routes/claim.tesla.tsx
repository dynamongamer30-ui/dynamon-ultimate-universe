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

const looseRpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type ClaimState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "claimed"; expiresAt?: string; count?: number; max?: number; already?: boolean }
  | { kind: "error"; message: string };

function TeslaClaimPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef(false);
  const [state, setState] = useState<ClaimState>({ kind: "idle" });

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
    if (!user || attempted.current) return;
    attempted.current = true;
    setState({ kind: "loading" });
    try {
      const { data, error } = await looseRpc("claim_campaign_pass", { p_campaign_slug: "tesla" });
      if (error) throw new Error("claim_failed");
      const result = data as {
        ok?: boolean;
        error?: string;
        expires_at?: string;
        claimed_count?: number;
        max_claims?: number;
      } | null;
      if (result?.ok) {
        setState({
          kind: "claimed",
          expiresAt: result.expires_at,
          count: result.claimed_count,
          max: result.max_claims,
        });
        toast.success("Tesla Phoenix Pass claimed");
        return;
      }
      if (result?.error === "already_claimed") {
        setState({ kind: "claimed", expiresAt: result.expires_at, already: true });
        return;
      }
      if (result?.error === "sold_out") {
        setState({
          kind: "error",
          message: "All 100 Tesla Phoenix Passes have already been claimed.",
        });
        return;
      }
      setState({ kind: "error", message: "This campaign is not currently available." });
    } catch {
      setState({ kind: "error", message: "We could not complete the claim. Please try again." });
      attempted.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && state.kind === "idle") void claim();
  }, [authLoading, user, state.kind, claim]);

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
        {authLoading || state.kind === "loading" ? (
          <StatusCard
            icon={<Loader2 className="h-8 w-8 animate-spin" />}
            title="Checking your claim…"
            text="Please keep this page open for a moment."
          />
        ) : !user ? (
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
              className="press mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition hover:brightness-110"
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
                ? "This Google account has already claimed its Tesla Phoenix Pass."
                : "Your Tesla Phoenix Pass is now active in your account."}
            </p>
            {state.expiresAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Valid until {new Date(state.expiresAt).toLocaleDateString()}.
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
              className="press mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 transition hover:brightness-110"
            >
              Pick a mod <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : state.kind === "error" ? (
          <StatusCard
            icon={<Sparkles className="h-8 w-8 text-amber-300" />}
            title="Campaign unavailable"
            text={state.message}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

function StatusCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
      {icon}
      <h2 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
