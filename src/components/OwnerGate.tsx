import { useEffect, useState, type ReactNode } from "react";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { PageShell } from "@/components/PageShell";

const RETURN_KEY = "owner_gate_return_to";

export function OwnerGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // After OAuth round-trip: if we land on "/" with a stored return path and a
  // signed-in owner session, bounce back to where we started.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || !profile?.is_owner) return;
    const back = sessionStorage.getItem(RETURN_KEY);
    if (back && back !== window.location.pathname) {
      sessionStorage.removeItem(RETURN_KEY);
      navigate({ to: back });
    } else if (back) {
      sessionStorage.removeItem(RETURN_KEY);
    }
  }, [user, profile?.is_owner, navigate]);

  const signIn = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Remember where we were so we can return after OAuth.
      sessionStorage.setItem(RETURN_KEY, window.location.pathname);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        setErr(result.error.message || "Google sign-in failed");
        sessionStorage.removeItem(RETURN_KEY);
        setBusy(false);
      }
      // Browser redirects to Google; on return, useAuth picks up the session.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
      sessionStorage.removeItem(RETURN_KEY);
      setBusy(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <PageShell>
        <p className="text-center text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-3xl glass p-8 text-center">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground"
            style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
          >
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">Owner sign-in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The control panel is restricted to the site owner. Sign in with the owner Google account to continue.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>
          {err && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" /> {err}
            </p>
          )}
        </div>
      </PageShell>
    );
  }

  if (!profile?.is_owner) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-3xl glass p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/20 text-rose-300">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're signed in as <span className="font-semibold">{user.email}</span>, but this area is owner-only.
            Sign out and sign in with the owner Google account.
          </p>
        </div>
      </PageShell>
    );
  }

  return <>{children}</>;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8L6 32.6C9.2 39 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.3C41.4 35.7 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
