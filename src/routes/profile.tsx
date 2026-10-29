import { AccountOverview } from "@/components/AccountOverview";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { Loader2, Save, User as UserIcon, AtSign, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { OwnerBadge, VerifiedFounderChip } from "@/components/OwnerBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { useUsernameAvailability, type UsernameStatus } from "@/hooks/useUsernameAvailability";
import { ProfileLoadError } from "@/components/ProfileLoadError";
import { toast } from "sonner";
import { playClick, playSuccess, playSoft } from "@/lib/sound";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My profile — Dynamon Universe" },
      {
        name: "description",
        content: "Edit your trainer identity: display name, avatar and more.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, error, refresh } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
  }, [user, loading, navigate]);

  if (loading || profileLoading || !user)
    return (
      <PageShell>
        <div role="status" className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="sr-only">Loading profile</span>
        </div>
      </PageShell>
    );
  if (error && !profile)
    return (
      <PageShell>
        <ProfileLoadError retry={refresh} />
      </PageShell>
    );
  if (!profile)
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl font-extrabold">Finish setting up your trainer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a username, avatar and gender first.
          </p>
          <Link
            to="/auth"
            className="touch-target mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-primary-foreground"
          >
            Complete profile
          </Link>
        </div>
      </PageShell>
    );
  return <ProfileEditor key={user.id} user={user} profile={profile} refresh={refresh} />;
}

function ProfileEditor({
  user,
  profile,
  refresh,
}: {
  user: User;
  profile: Profile;
  refresh: () => Promise<void>;
}) {
  const reducedMotion = useReducedMotionPreference();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [gender, setGender] = useState(profile.gender);
  const [avatarId, setAvatarId] = useState(profile.avatar_url);
  const [username, setUsername] = useState(profile.username ?? "");
  const [savedUsername, setSavedUsername] = useState(profile.username);
  const availability = useUsernameAvailability(username, savedUsername);
  const usernameStatus = availability.status;
  const [busy, setBusy] = useState(false);
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
    if (!displayName.trim()) {
      toast.error("Display name required");
      return;
    }
    if (!gender) {
      toast.error("Pick a gender");
      return;
    }
    if (!avatarId) {
      toast.error("Pick an avatar");
      return;
    }
    if (!availability.canSubmit) {
      toast.error("Username unavailable");
      return;
    }
    locked.current = true;
    setBusy(true);
    setSaveError(false);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          display_name: displayName.trim(),
          gender,
          avatar_url: avatarId,
        })
        .eq("id", user.id)
        .select("id");
      if (error || !data?.some((row) => row.id === user.id))
        throw error ?? new Error("Profile save was not confirmed");
      if (!active.current) return;
      setUsername(username.trim());
      setSavedUsername(username.trim());
      setDisplayName(displayName.trim());
      playSuccess();
      toast.success("Profile updated");
      await refresh();
    } catch {
      if (active.current) setSaveError(true);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  const avatarUrl = avatarId;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl py-4 sm:py-6 lg:py-12">
        <header className="mb-5 sm:mb-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Your profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your trainer identity. Save when you are ready.
          </p>
        </header>
        <AccountOverview />
        <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start">
          {/* Identity card */}
          <motion.aside
            aria-label="Profile preview"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
            animate={{ opacity: 1, y: 0 }}
            className="surface-l1 relative min-w-0 edge-light rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Profile preview
            </p>
            <div className="relative flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    width={128}
                    height={128}
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-primary/40 lg:h-32 lg:w-32"
                  />
                ) : (
                  <div
                    className="grid h-16 w-16 place-items-center rounded-full text-2xl font-bold text-primary-foreground lg:h-32 lg:w-32 lg:text-4xl"
                    style={{ background: "var(--gradient-violet)" }}
                  >
                    {displayName[0]?.toUpperCase() ?? "T"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere] lg:w-full">
                <h2 className="font-display text-lg font-extrabold tracking-tight lg:text-2xl">
                  {displayName || "Your name"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{username || profile.username}
                </p>
                {profile.is_owner && (
                  <div className="mt-3 flex flex-wrap gap-2 lg:justify-center">
                    <OwnerBadge size="sm" />
                    <VerifiedFounderChip />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" /> Trusted Authority
                    </span>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Preview your changes here. Save to update your profile.
            </p>
          </motion.aside>

          {/* Edit form */}
          <motion.form
            aria-labelledby="edit-profile-title"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
            aria-busy={busy}
            className="min-w-0 space-y-6 edge-light rounded-2xl glass p-5 sm:p-8"
          >
            <div>
              <h2
                id="edit-profile-title"
                className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
              >
                Edit profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update your name, avatar or username anytime.
              </p>
            </div>

            <fieldset disabled={busy} className="min-w-0 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="profile-username"
                  label="Username"
                  hint="3–24 characters: letters, numbers or underscores."
                >
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="profile-username"
                      aria-describedby="profile-username-hint profile-username-status"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      maxLength={24}
                      required
                      className="w-full min-w-0 rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div id="profile-username-status" className="mt-1 min-h-4">
                    <UsernameBadge status={usernameStatus} />
                  </div>
                </Field>

                <Field id="profile-display-name" label="Display name" hint="Shown on reviews.">
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="profile-display-name"
                      aria-describedby="profile-display-name-hint"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
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
                  <button
                    type="button"
                    onClick={availability.retry}
                    className="touch-target underline"
                  >
                    Retry username check
                  </button>
                </p>
              )}

              <fieldset className="min-w-0">
                <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gender
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);
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
              </fieldset>

              <fieldset className="min-w-0">
                <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avatar
                </legend>
                <div className="mt-3">
                  <AvatarPicker value={avatarId} onChange={setAvatarId} gender={gender} />
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={busy || !availability.canSubmit}
                onMouseDown={playClick}
                aria-busy={busy}
                className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
              {saveError && (
                <p role="alert" className="text-sm text-rose-300">
                  Could not save your profile. Your changes are still here. Please try again.
                </p>
              )}
            </fieldset>
          </motion.form>
        </div>
      </div>
    </PageShell>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs leading-4 text-muted-foreground sm:min-h-8">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
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
    <span role="status" className={`text-xs font-semibold uppercase tracking-wider ${s.c}`}>
      {s.text}
    </span>
  );
}
