import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

export const Route = createFileRoute("/telegram/link")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Approve Telegram link - Dynamon Gamer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TelegramLinkPage,
});

type RpcClient = {
  rpc: (name: string, args: { p_token: string }) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

const ERROR_TEXT: Record<string, string> = {
  sign_in_required: "Sign in with Google to approve this link.",
  invalid_token: "This link is not valid. Go back to the bot and press /link to get a new one.",
  already_used: "This link has already been used. Go back to the bot and press /link for a new one.",
  expired: "This link has expired (links last 10 minutes). Go back to the bot and press /link for a new one.",
  account_already_linked: "This website account is already linked to a Telegram account. Unlink it in the bot first with /unlink.",
  telegram_already_linked: "This Telegram account is already linked to another website account. Unlink it in the bot first with /unlink.",
};

function TelegramLinkPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    setToken(value && /^[A-Za-z0-9_-]{20,128}$/.test(value) ? value : null);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setBusy(false);
      setError("This link is missing its code. Go back to the bot and press /link to get a new one.");
      return;
    }
    if (!user) {
      try {
        sessionStorage.setItem("dg_after_auth", "/telegram/link?token=" + encodeURIComponent(token));
      } catch {
        // The user can reopen the bot link after signing in.
      }
      navigate({ to: "/auth" });
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    let active = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const client = supabase as unknown as RpcClient;
        const { data, error: rpcError } = await client.rpc("approve_bot_link", { p_token: token });
        if (!active) return;
        if (rpcError) throw new Error(rpcError.message);
        const result = data as { ok?: boolean; error?: string } | null;
        if (result?.ok === true) {
          setDone(true);
        } else {
          const code = result?.error ?? "invalid_token";
          setError(ERROR_TEXT[code] ?? "The link could not be approved. Try again from the bot.");
        }
      } catch {
        if (!active) return;
        setError("Something went wrong while approving the link. Please try again in a minute.");
      } finally {
        if (active) setBusy(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, user, token, navigate]);

  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <section className="surface-l1 edge-light rounded-2xl p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary-ink">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Approve Telegram link
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This connects the Telegram account that asked for the link to your Dynamon Gamer website account.
            Only approve if you started this link yourself in the bot.
          </p>

          {busy ? (
            <div role="status" className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Approving the link…
            </div>
          ) : done ? (
            <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Telegram is now linked
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                You can close this page and return to the bot. It will confirm the link.
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p role="alert" className="flex items-start gap-2 text-sm text-rose-300">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-5">
            <Link to="/profile" className="text-sm font-semibold text-primary-ink hover:underline">
              Back to website profile
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
