import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "./PageShell";
import { supabase } from "@/integrations/supabase/client";
type Campaign = {
  slug: string;
  url_prefix: string;
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
  verification_expired: "Complete the security check again to continue.",
  verification_failed: "Verification failed or was already used. Complete a fresh security check.",
  verification_required: "Complete the security check first.",
  rate_limited: "Too many attempts. Please wait ten minutes before trying again.",
  already_claimed: "Your reward is already in My Rewards.",
  handoff_expired: "Open the campaign again to continue your claim.",
  campaign_inactive: "This campaign is paused, has not started, or has ended.",
  sold_out: "All passes in this campaign have been claimed.",
  not_found: "This campaign is not available.",
  proxy_required: "Secure verification could not be confirmed. Refresh and try again.",
  server_unavailable: "The result could not be confirmed. Check My Rewards before retrying.",
};
export function PhoenixCampaign({ slug, prefix }: { slug: string; prefix?: string }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState("");
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
        if (prefix && d.campaign?.url_prefix !== prefix)
          throw Error("This campaign is not available.");
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
  }, [slug, prefix, revision]);
  useEffect(() => {
    const refresh = async () => {
      if (!user) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || session.user.id !== identity.current) return;
      try {
        const response = await fetch(`/api/phoenix/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "status" }),
        });
        const data = await response.json();
        if (response.ok && data.claimed && identity.current === session.user.id) setSuccess(true);
      } catch {
        /* Refresh status remains available. */
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [user?.id, slug, revision]);
  useEffect(() => {
    setIntent("");
    setToken("");
    setTelegramUrl("");
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
      } else if (
        data.ok &&
        typeof data.telegram_url === "string" &&
        /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=pass_[a-f0-9]{48}$/.test(data.telegram_url)
      ) {
        setTelegramUrl(data.telegram_url);
        setIntent("");
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
        <h1 className="mt-3 font-display text-3xl font-bold">
          {campaign?.title || "Campaign reward"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Celebrate with a special reward. Continue in Telegram to complete your claim.
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
            <p className="font-bold">Your reward has been added to your account.</p>
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
                sessionStorage.setItem("dg_after_auth", location.pathname);
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
        ) : telegramUrl ? (
          <div className="mt-5 space-y-3">
            <a
              href={telegramUrl}
              className="touch-target inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
            >
              Continue in Telegram
            </a>
            <p className="text-sm text-muted-foreground">
              Confirm your website account in the bot, then join the required communities. Your
              reward will be added automatically.
            </p>
          </div>
        ) : !intent ? (
          <button
            disabled={busy}
            onClick={() => void action("prepare")}
            className="touch-target mt-5 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Claim your pass"}
          </button>
        ) : (
          <>
            <div ref={widget} className="mt-5 min-h-16" />
            <button
              disabled={busy || !token}
              onClick={() => void action("claim")}
              className="touch-target mt-4 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Opening Telegram…" : "Continue in Telegram"}
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
