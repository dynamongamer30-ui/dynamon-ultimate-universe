import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "./PageShell";
import { supabase } from "@/integrations/supabase/client";
type Campaign = {
  slug: string;
  title: string;
  active: boolean;
  max_claims: number;
  claimed_count: number;
  remaining: number;
  starts_at: string | null;
  ends_at: string | null;
};
const errors: Record<string, string> = {
  sign_in_required: "Sign in again to continue.",
  verified_account_required: "Confirm your account email before claiming.",
  verification_unavailable: "Secure claims are temporarily unavailable. No pass has been consumed.",
  verification_expired: "Your verification expired. Prepare a fresh claim and try again.",
  verification_failed: "Verification failed or was already used. Complete a fresh security check.",
  verification_required: "Complete the security check first.",
  rate_limited: "Too many attempts. Please wait ten minutes before trying again.",
  browser_already_claimed: "This browser has already claimed a pass in this campaign.",
  campaign_inactive: "This campaign is paused, has not started, or has ended.",
  sold_out: "All passes in this campaign have been claimed.",
  not_found: "This campaign is not available.",
  proxy_required: "Secure verification could not be confirmed. Refresh and try again.",
  server_unavailable: "The result could not be confirmed. Check My Rewards before retrying.",
};
export function PhoenixCampaign({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [intent, setIntent] = useState("");
  const [token, setToken] = useState("");
  const [revision, setRevision] = useState(0);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const locked = useRef(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  useEffect(() => {
    let active = true;
    const c = new AbortController();
    setLoading(true);
    setCampaign(null);
    setSuccess(false);
    setIntent("");
    setError("");
    fetch(`/api/phoenix/${encodeURIComponent(slug)}`, { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(errors[d.error] || "Campaign unavailable.");
        if (active) {
          setCampaign(d.campaign);
          setEnabled(d.enabled === true);
        }
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [slug, revision]);
  useEffect(() => {
    setIntent("");
    setToken("");
    setSuccess(false);
    setError("");
  }, [user?.id]);
  useEffect(() => {
    if (!intent || !widget.current) return;
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const render = () => {
      if (!active || !widget.current || !window.turnstile) return;
      clearTimeout(timeout);
      widgetId.current = window.turnstile.render(widget.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        action: "phoenix_claim",
        theme: "auto",
        callback: (value) => {
          if (active) setToken(value);
        },
        "expired-callback": () => {
          if (active) setToken("");
        },
        "error-callback": () => {
          if (active) {
            setToken("");
            setError("Security check could not load. Try preparing the claim again.");
          }
        },
      });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
      );
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render, { once: true });
      timeout = setTimeout(() => {
        if (active) setError("Security check timed out. Refresh or prepare the claim again.");
      }, 15000);
    }
    return () => {
      active = false;
      clearTimeout(timeout);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [intent]);
  const action = async (type: "prepare" | "claim") => {
    if (locked.current || !user) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const actor = user.id;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user.id !== actor) throw Error("Sign in again before claiming.");
      const r = await fetch(`/api/phoenix/${encodeURIComponent(slug)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: type, intent, token }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await r.json();
      if (identity.current !== actor) return;
      if (!r.ok || data.error)
        throw Error(
          errors[data.error] || "Claim could not be confirmed. Check My Rewards before retrying.",
        );
      if (type === "prepare") {
        if (typeof data.intent !== "string") throw Error("Verification unavailable.");
        setIntent(data.intent);
      } else if (data.ok) {
        setSuccess(true);
        setIntent("");
        setCampaign((c) =>
          c && typeof data.claimed_count === "number"
            ? {
                ...c,
                claimed_count: data.claimed_count,
                remaining: Math.max(0, c.max_claims - data.claimed_count),
              }
            : c,
        );
      } else throw Error("Claim could not be confirmed.");
    } catch (cause) {
      if (identity.current === actor)
        setError(cause instanceof Error ? cause.message : "Claim unavailable.");
      if (type === "claim") {
        setToken("");
        setIntent("");
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const available =
    campaign?.active &&
    campaign.remaining > 0 &&
    (!campaign.starts_at || Date.parse(campaign.starts_at) <= Date.now()) &&
    (!campaign.ends_at || Date.parse(campaign.ends_at) > Date.now());
  return (
    <PageShell>
      <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-ink">
          Phoenix Pass campaign
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          {campaign?.title || "Claim a Phoenix Pass"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          One pass per verified account and recognized browser for this campaign. A browser check is
          not a permanent phone hardware ID.
        </p>
        {loading ? (
          <p role="status" className="mt-5">
            Loading campaign…
          </p>
        ) : campaign ? (
          <div className="my-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border p-4 text-center">
            {[
              ["Total", campaign.max_claims],
              ["Claimed", campaign.claimed_count],
              ["Remaining", campaign.remaining],
            ].map(([label, n]) => (
              <div key={label}>
                <strong className="block text-xl">{n}</strong>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5">This campaign is unavailable.</p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {success ? (
          <div role="status" className="mt-5">
            <p className="font-bold">Your Phoenix Pass is ready.</p>
            <Link
              to="/rewards"
              hash="my-rewards"
              className="touch-target mt-4 inline-flex rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
            >
              Open My Rewards
            </Link>
          </div>
        ) : !user ? (
          <Link
            to="/auth"
            onClick={() => {
              try {
                sessionStorage.setItem("dg_after_auth", `/phoenix-pass/claim/${slug}`);
              } catch {
                /* optional */
              }
            }}
            className="touch-target mt-5 inline-flex rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
          >
            Sign in to claim
          </Link>
        ) : !available ? (
          <p className="mt-5 text-sm">
            This campaign is paused, outside its claim dates, or fully claimed.
          </p>
        ) : !enabled ? (
          <p className="mt-5 text-sm">
            Secure claims are being configured. Your existing passes remain in My Rewards.
          </p>
        ) : !intent ? (
          <button
            disabled={busy}
            onClick={() => void action("prepare")}
            className="touch-target mt-5 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Verify and prepare claim"}
          </button>
        ) : (
          <>
            <div ref={widget} className="mt-5 min-h-16" />
            <button
              disabled={busy || !token}
              onClick={() => void action("claim")}
              className="touch-target mt-4 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Confirming claim…" : "Claim one Phoenix Pass"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setIntent("");
                setToken("");
              }}
              className="touch-target ml-3 text-sm underline"
            >
              Start verification again
            </button>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link to="/help" hash="campaigns" className="underline">
            How campaigns work
          </Link>
          <button disabled={busy} onClick={() => setRevision((n) => n + 1)} className="underline">
            Refresh status
          </button>
        </div>
      </section>
    </PageShell>
  );
}
