import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Save, User as UserIcon, AtSign, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { OwnerBadge, VerifiedFounderChip } from "@/components/OwnerBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getAvatarUrl } from "@/lib/avatars";
import { toast } from "sonner";
import { playClick, playSuccess, playSoft } from "@/lib/sound";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My profile — Dynamon Universe" },
      { name: "description", content: "Edit your trainer identity: display name, avatar and more." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setGender(profile.gender);
      setAvatarId(profile.avatar_url);
      setUsername(profile.username);
    }
  }, [profile]);

  // username availability
  useEffect(() => {
    const u = username.trim();
    if (!u || (profile && u.toLowerCase() === profile.username.toLowerCase())) {
      setUsernameStatus("idle"); return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { _username: u });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data ? "ok" : "taken");
    }, 350);
    return () => clearTimeout(t);
  }, [username, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) { toast.error("Display name required"); return; }
    if (!gender) { toast.error("Pick a gender"); return; }
    if (!avatarId) { toast.error("Pick an avatar"); return; }
    if (username !== profile?.username && usernameStatus !== "ok") {
      toast.error("Username unavailable"); return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          display_name: displayName.trim(),
          gender,
          avatar_url: avatarId,
        })
        .eq("id", user.id);
      if (error) throw error;
      playSuccess();
      toast.success("Profile updated");
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  };

  if (loading || profileLoading || !user) {
    return (
      <PageShell>
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Finish setting up your trainer</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick a username, avatar and gender first.</p>
          <Link to="/auth" className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            Complete profile
          </Link>
        </div>
      </PageShell>
    );
  }

  const avatarUrl = getAvatarUrl(avatarId);

  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-8 py-6 lg:grid-cols-[1fr_1.5fr] lg:py-12">
        {/* Identity card */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl glass p-6 lg:sticky lg:top-24"
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-accent/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/40" />
              ) : (
                <div className="grid h-32 w-32 place-items-center rounded-full text-4xl font-bold text-primary-foreground" style={{ background: "var(--gradient-violet)" }}>
                  {displayName[0]?.toUpperCase() ?? "T"}
                </div>
              )}
              {profile.is_owner && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2"><OwnerBadge size="md" /></span>
              )}
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold">{displayName || "Your name"}</h1>
            <p className="text-sm text-muted-foreground">@{username || profile.username}</p>
            {profile.is_owner && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <VerifiedFounderChip />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Trusted Authority
                </span>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{user.email}</p>
          </div>
        </motion.aside>

        {/* Edit form */}
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="space-y-6 rounded-3xl glass p-7 sm:p-8"
        >
          <div>
            <h2 className="font-display text-2xl font-bold">Edit profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update your name, avatar or username anytime.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" hint="3–24 chars, letters, numbers, _">
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={username} onChange={(e) => setUsername(e.target.value)}
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
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)}
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
                  onClick={() => { setGender(g); playSoft(); }}
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avatar</p>
            <div className="mt-3">
              <AvatarPicker value={avatarId} onChange={setAvatarId} gender={gender} />
            </div>
          </div>

          <button
            type="submit" disabled={busy} onMouseDown={playClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </motion.form>
      </div>
    </PageShell>
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
