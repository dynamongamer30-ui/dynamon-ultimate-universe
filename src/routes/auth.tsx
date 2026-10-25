import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { createFileRoute, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Sparkles, User as UserIcon, AtSign, Check, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUsernameAvailability, type UsernameStatus } from "@/hooks/useUsernameAvailability";
import { ProfileLoadError } from "@/components/ProfileLoadError";
import { toast } from "sonner";
import { playClick, playSuccess, playSoft } from "@/lib/sound";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Dynamon Universe" },
      {
        name: "description",
        content:
          "Create your trainer profile to download Dynamons World mods, leave reviews and join the community.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

type Step = "credentials" | "profile";

function AuthPage() {
  const reducedMotion = useReducedMotionPreference();
  const { user, loading } = useAuth();
  const {
    profile,
    loading: profileLoading,
    loaded: profileLoaded,
    error: profileError,
    refresh,
  } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [step, setStep] = useState<Step>("credentials");
  const [busy, setBusy] = useState(false);
  const redirectingUser = useRef<string | null>(null);

  const afterAuthPath = () => {
    try {
      const value = sessionStorage.getItem("dg_after_auth");
      if (value?.startsWith("/") && !value.startsWith("//")) return value;
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    return "/mods";
  };

  // Route transitions can briefly remount the old outlet; redirect only while auth is active.
  useEffect(() => {
    if (pathname !== "/auth" || loading || profileLoading || (profileError && !profileLoaded))
      return;
    if (user && profile) {
      if (redirectingUser.current === user.id) return;
      redirectingUser.current = user.id;
      const destination = afterAuthPath();
      try {
        sessionStorage.removeItem("dg_after_auth");
      } catch {
        /* ignore */
      }
      navigate({ to: destination });
    }
    if (!user) redirectingUser.current = null;
    if (user && !profile) setStep("profile");
  }, [pathname, user, profile, loading, profileLoading, profileError, profileLoaded, navigate]);

  const handleGoogle = async () => {
    playClick();
    setBusy(true);
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
      <div className="mx-auto grid max-w-6xl gap-5 py-2 sm:gap-8 sm:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-12 lg:py-12">
        <motion.header
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
        >
          <h1 className="font-display text-2xl font-black tracking-tight leading-tight sm:text-4xl lg:text-5xl">
            Your trainer <span className="text-gradient">account.</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Save builds. Join the conversation.
          </p>
        </motion.header>

        <motion.div
          role="region"
          aria-label="Account access"
          key={step}
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          className="relative min-w-0 overflow-hidden edge-light rounded-2xl glass p-5 shadow-elev sm:p-8 lg:col-start-2 lg:row-start-1 lg:row-span-2"
        >
          <div
            role="list"
            aria-label="Account setup progress"
            className="mb-4 flex flex-wrap items-center gap-2 text-xs sm:mb-6"
          >
            <Chip active={step === "credentials" || !user}>1. Account</Chip>
            <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <Chip active={step === "profile" && !!user}>2. Profile</Chip>
          </div>
          {profileError && profileLoaded && <ProfileLoadError retry={refresh} />}
          <AnimatePresence mode="wait">
            {loading || profileLoading ? (
              <div role="status" className="flex items-center gap-2 py-10">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading profile
              </div>
            ) : profileError && !profileLoaded ? (
              <ProfileLoadError retry={refresh} />
            ) : step === "credentials" && !user ? (
              <CredentialsStep key="creds" busy={busy} onGoogle={handleGoogle} />
            ) : (
              <ProfileStep key={user?.id ?? "profile"} onDone={refresh} />
            )}
          </AnimatePresence>
        </motion.div>

        <aside
          aria-labelledby="account-benefits-title"
          className="min-w-0 rounded-2xl border border-border/70 bg-card/35 p-5 sm:p-6 lg:col-start-1 lg:row-start-2"
        >
          <h2
            id="account-benefits-title"
            className="flex items-center gap-2 font-display text-lg font-bold"
          >
            <Sparkles className="h-4 w-4 text-primary-ink" aria-hidden="true" /> Make it yours
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              "Choose an avatar and your own display name",
              "Update your unique username from your profile",
              "Keep favorite builds together in your vault",
              "Join reviews and react to other trainers",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}

function Chip({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      role="listitem"
      aria-current={active ? "step" : undefined}
      className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold uppercase tracking-wider ${active ? "border-primary/40 bg-primary/10 text-primary-ink" : "border-border text-muted-foreground"}`}
    >
      {children}
    </span>
  );
}

function CredentialsStep({ busy, onGoogle }: { busy: boolean; onGoogle: () => void }) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="relative"
    >
      <h2
        id="auth-step-title"
        className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
      >
        Welcome, Trainer
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in with Google to continue.</p>

      <button
        onClick={onGoogle}
        disabled={busy}
        className="touch-target mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link to="/disclaimer" tabIndex={0} className="text-primary-ink hover:underline">
          Disclaimer &amp; Safety
        </Link>{" "}
        and{" "}
        <Link to="/privacy" tabIndex={0} className="text-primary-ink hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground/80">
        Accounts with no recorded activity for 30 days may be deleted.
      </p>
    </motion.div>
  );
}

function ProfileStep({ onDone }: { onDone: () => Promise<void> }) {
  const reducedMotion = useReducedMotionPreference();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const availability = useUsernameAvailability(username);
  const usernameStatus = availability.status;
  const [saveError, setSaveError] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked.current) return;
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    if (!availability.canSubmit) {
      toast.error("Pick a valid, available username");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!gender) {
      toast.error("Select a gender");
      return;
    }
    if (!avatarId) {
      toast.error("Pick an avatar");
      return;
    }

    locked.current = true;
    setBusy(true);
    setSaveError(false);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username: username.trim(),
          display_name: displayName.trim(),
          gender,
          avatar_url: avatarId,
        })
        .select("id");
      if (error || !data?.some((row) => row.id === user.id))
        throw error ?? new Error("Profile creation was not confirmed");
      if (!active.current) return;
      playSuccess();
      toast.success("Profile ready — welcome to the Universe!");
      await onDone();
    } catch {
      if (active.current) setSaveError(true);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <motion.form
      aria-labelledby="profile-step-title"
      onSubmit={submit}
      aria-busy={busy}
      initial={reducedMotion ? false : { opacity: 0, x: 10 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="relative space-y-5"
    >
      <div>
        <h2
          id="profile-step-title"
          className="font-display text-2xl font-extrabold uppercase tracking-tight"
        >
          Build your trainer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only takes a moment. You can update it anytime.
        </p>
      </div>

      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" hint="3–24 chars, letters, numbers, _">
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ember_master"
                maxLength={24}
                required
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
                maxLength={40}
                required
                className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </Field>
        </div>

        {usernameStatus === "error" && (
          <p role="alert" className="text-sm text-rose-300">
            Could not check this username.{" "}
            <button type="button" onClick={availability.retry} className="touch-target underline">
              Retry username check
            </button>
          </p>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gender
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGender(g);
                  setAvatarId(null);
                  playSoft();
                }}
                aria-pressed={gender === g}
                className={`touch-target rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  gender === g
                    ? "border-primary/50 bg-primary/10 text-primary-ink"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pick your avatar
            </p>
            {gender && (
              <p className="text-xs text-muted-foreground">
                {gender === "female"
                  ? "10 female heroes"
                  : gender === "male"
                    ? "10 male heroes"
                    : "All 20 heroes"}
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
          type="submit"
          disabled={busy || !availability.canSubmit}
          aria-busy={busy}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Enter the Universe
        </button>
        {saveError && (
          <p role="alert" className="text-sm text-rose-300">
            Could not save your profile. Your changes are still here. Please try again.
          </p>
        )}
      </fieldset>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link to="/disclaimer" className="text-primary-ink hover:underline">
          Disclaimer & Safety
        </Link>
        .
      </p>
    </motion.form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function UsernameBadge({ status }: { status: UsernameStatus }) {
  if (status === "idle") return null;
  const map = {
    checking: { text: "checking…", c: "text-muted-foreground" },
    ok: { text: "available", c: "text-emerald-400" },
    taken: { text: "taken", c: "text-rose-400" },
    invalid: { text: "invalid", c: "text-amber-400" },
    error: { text: "unverified", c: "text-rose-400" },
  } as const;
  const s = map[status];
  return (
    <span
      role="status"
      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider ${s.c}`}
    >
      {s.text}
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.44.36-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
