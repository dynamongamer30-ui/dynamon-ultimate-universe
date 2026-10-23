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
      <div className="mx-auto grid max-w-6xl gap-8 py-6 lg:grid-cols-[1fr_1.5fr] lg:py-12">
        {/* Identity card */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-l1 relative overflow-hidden edge-light rounded-2xl p-6 lg:sticky lg:top-24"
        >
          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/40"
                />
              ) : (
                <div
                  className="grid h-32 w-32 place-items-center rounded-full text-4xl font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-violet)" }}
                >
                  {displayName[0]?.toUpperCase() ?? "T"}
                </div>
              )}
              {profile.is_owner && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <OwnerBadge size="md" />
                </span>
              )}
            </div>
            <h1 className="mt-6 font-display text-2xl font-extrabold uppercase tracking-tight">
              {displayName || "Your name"}
            </h1>
            <p className="text-sm text-muted-foreground">@{username || profile.username}</p>
            {profile.is_owner && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <VerifiedFounderChip />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Trusted Authority
                </span>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{user.email}</p>
          </div>
        </motion.aside>

        {/* Edit form */}
        <motion.form
          aria-labelledby="edit-profile-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          aria-busy={busy}
          className="route-hero space-y-6 edge-light rounded-2xl glass p-7 sm:p-8"
        >
          <div>
            <h2
              id="edit-profile-title"
              className="font-display text-2xl font-extrabold uppercase tracking-tight"
            >
              Edit profile
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your name, avatar or username anytime.
            </p>
          </div>

          <fieldset disabled={busy} className="min-w-0 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" hint="3–24 chars, letters, numbers, _">
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
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
                      playSoft();
                    }}
                    aria-pressed={gender === g}
                    className={`touch-target rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${
                      gender === g
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avatar
              </p>
              <div className="mt-3">
                <AvatarPicker value={avatarId} onChange={setAvatarId} gender={gender} />
              </div>
            </div>

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
    </PageShell>
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
