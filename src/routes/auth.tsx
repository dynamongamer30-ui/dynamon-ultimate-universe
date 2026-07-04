import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Loader2, Sparkles, User as UserIcon, AtSign, Check, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { playClick, playSuccess, playSoft } from "@/lib/sound";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Dynamon Universe" },
      { name: "description", content: "Create your trainer profile to download Dynamons World mods, leave reviews and join the community." },
    ],
  }),
  component: AuthPage,
});

type Step = "credentials" | "profile";

function AuthPage() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useProfile();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If user already has a complete profile, send them to /mods
  useEffect(() => {
    if (loading || profileLoading) return;
    if (user && profile) navigate({ to: "/mods" });
    if (user && !profile) setStep("profile");
  }, [user, profile, loading, profileLoading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created — check your email, then sign in.");
          setMode("signin");
          return;
        }
        playSuccess();
        toast.success("Account created — finish your profile.");
        setStep("profile");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("Sign-in did not start. Please try again.");
        playSuccess();
        toast.success("Welcome back, Trainer.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    playClick(); setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setBusy(false);
      }
      // Browser redirects to Google; on return, useAuth picks up the session.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-10 py-6 lg:grid-cols-[1.1fr_1.2fr] lg:items-start lg:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Trainers only
          </div>
          <h1 className="mt-5 font-display text-4xl font-black uppercase tracking-tight leading-[1.05] sm:text-5xl">
            Forge your <span className="text-gradient">trainer identity.</span>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            One trainer, one username. Pick a profile avatar from 20 hand-crafted heroes and join the Dynamon vault.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Unique @username locked to your account",
              "20 aurora-ringed avatars to choose from",
              "Review mods, like comments, climb the wall",
              "Early access to every weekly drop",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <Check className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>

          {/* Progress chips */}
          <div className="mt-8 flex items-center gap-2 text-xs">
            <Chip active={step === "credentials" || !user}>1. Account</Chip>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Chip active={step === "profile" && !!user}>2. Profile</Chip>
          </div>
        </motion.div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden edge-light rounded-2xl glass p-7 shadow-elev sm:p-8"
        >

          <AnimatePresence mode="wait">
            {step === "credentials" && !user ? (
              <CredentialsStep
                key="creds"
                mode={mode} setMode={setMode}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                busy={busy} onEmail={handleEmail} onGoogle={handleGoogle}
              />
            ) : (
              <ProfileStep key="profile" onDone={async () => { await refresh(); navigate({ to: "/mods" }); }} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageShell>
  );
}

function Chip({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold uppercase tracking-wider ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
      {children}
    </span>
  );
}

function CredentialsStep({
  mode, setMode, email, setEmail, password, setPassword, busy, onEmail, onGoogle,
}: {
  mode: "signin" | "signup";
  setMode: (m: "signin" | "signup") => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  busy: boolean;
  onEmail: (e: React.FormEvent) => void;
  onGoogle: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="relative">
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Continue with Google or email.</p>

      <button
        onClick={onGoogle} disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card disabled:opacity-60"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onEmail} className="space-y-3">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com" autoComplete="email"
            className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••• (min 6 characters)" autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit" disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Continue"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already a Trainer?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary hover:underline">
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </motion.div>
  );
}

function ProfileStep({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  // Live username availability check
  useEffect(() => {
    const u = username.trim();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { _username: u });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data ? "ok" : "taken");
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Not signed in"); return; }
    if (usernameStatus !== "ok") { toast.error("Pick a valid, available username"); return; }
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    if (!gender) { toast.error("Select a gender"); return; }
    if (!avatarId) { toast.error("Pick an avatar"); return; }

    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: username.trim(),
        display_name: displayName.trim(),
        gender,
        avatar_url: avatarId,
      });
      if (error) throw error;
      playSuccess();
      toast.success("Profile ready — welcome to the Universe!");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
      className="relative space-y-5"
    >
      <div>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Build your trainer</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only takes a moment. You can update it anytime.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" hint="3–24 chars, letters, numbers, _">
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ember_master"
              maxLength={24} required
              className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-20 text-sm outline-none focus:border-primary"
            />
            <UsernameBadge status={usernameStatus} />
          </div>
        </Field>

        <Field label="Display name" hint="Shown on reviews">
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ember Master"
              maxLength={40} required
              className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </Field>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["male", "female", "other"] as const).map((g) => (
            <button
              key={g} type="button"
              onClick={() => { setGender(g); setAvatarId(null); playSoft(); }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${
                gender === g ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pick your avatar</p>
          {gender && (
            <p className="text-[11px] text-muted-foreground">
              {gender === "female" ? "10 female heroes" : gender === "male" ? "10 male heroes" : "All 20 heroes"}
            </p>
          )}
        </div>
        <div className="mt-3">
          {gender ? (
            <AvatarPicker value={avatarId} onChange={setAvatarId} gender={gender} />
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
              Pick a gender to see your heroes.
            </p>
          )}
        </div>
      </div>

      <button
        type="submit" disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Enter the Universe
      </button>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our <Link to="/disclaimer" className="text-primary hover:underline">Disclaimer & Safety</Link>.
      </p>
    </motion.form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/80">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function UsernameBadge({ status }: { status: "idle" | "checking" | "ok" | "taken" | "invalid" }) {
  if (status === "idle") return null;
  const map = {
    checking: { text: "checking…", c: "text-muted-foreground" },
    ok:       { text: "available", c: "text-emerald-400" },
    taken:    { text: "taken",     c: "text-rose-400" },
    invalid:  { text: "invalid",   c: "text-amber-400" },
  } as const;
  const s = map[status];
  return (
    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wider ${s.c}`}>
      {s.text}
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.44.36-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
