import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/telegram/link")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Link Telegram — Dynamon Gamer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TelegramLinkPage,
});

type RpcClient = {
  rpc: (name: string, args: { p_token_hash: string }) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

function makeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(Array.from(bytes, (value) => String.fromCharCode(value)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function TelegramLinkPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      try {
        sessionStorage.setItem("dg_after_auth", "/telegram/link");
      } catch {
        // The user can still return to this URL manually after Google sign-in.
      }
      navigate({ to: "/auth" });
      return;
    }
    if (attempted.current === user.id) return;
    attempted.current = user.id;

    let active = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const token = makeToken();
        const tokenHash = await sha256(token);
        const client = supabase as unknown as RpcClient;
        const { data, error: rpcError } = await client.rpc("create_bot_link_handoff", {
          p_token_hash: tokenHash,
        });
        if (rpcError) throw new Error(rpcError.message);
        if (!data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true)
          throw new Error("The website could not create a secure Telegram link request.");
        if (!active) return;
        const expiry = (data as { expires_at?: string }).expires_at ?? null;
        setExpiresAt(expiry);
        setTelegramUrl("https://t.me/DYNAMONHELPERBOT?start=link_" + token);
      } catch (cause) {
        if (!active) return;
        attempted.current = null;
        setError(cause instanceof Error ? cause.message : "Could not create the link request.");
      } finally {
        if (active) setBusy(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, user, navigate]);

  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <section className="surface-l1 edge-light rounded-2xl p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary-ink">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Link your Telegram account
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Connect the Telegram account you use with @DYNAMONHELPERBOT to this Google-signed-in
            Dynamon Gamer website account. We never ask for your Google password in Telegram.
          </p>

          {busy ? (
            <div role="status" className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating a secure, single-use link request…
            </div>
          ) : error ? (
            <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p role="alert" className="text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => {
                  attempted.current = null;
                  setError(null);
                  setBusy(true);
                  window.location.reload();
                }}
                className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          ) : telegramUrl ? (
            <div className="mt-8">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Secure request created
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open the bot link below. The request expires in 10 minutes and can be used once.
                </p>
                {expiresAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                Open @DYNAMONHELPERBOT <ExternalLink className="h-4 w-4" />
              </a>
              <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Press Start in Telegram if prompted.</li>
                <li>Join the official channel and group if the bot asks you to.</li>
                <li>The bot confirms the link after membership verification.</li>
              </ol>
            </div>
          ) : null}

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
