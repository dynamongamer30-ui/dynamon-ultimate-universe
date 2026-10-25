import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useConfirm } from "@/hooks/useConfirm";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";
import { Button } from "@/components/ui/button";

type Avatar = {
  id: string;
  url: string;
  gender: "male" | "female";
  label: string | null;
  active: boolean;
  sort_order: number;
};
type Upload = { url: string; gender: Avatar["gender"]; sort_order: number; uncertain: boolean };
const columns = "id,url,gender,label,active,sort_order";
// Storage uploads in this SDK do not accept AbortSignal. Bound the wait and
// ignore late receipts; an expired upload must never register a pool row.
function waitForUpload<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      signal.removeEventListener("abort", cancel);
      reject(new Error("Upload confirmation timed out"));
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", cancel);
        reject(error);
      },
    );
  });
}
const input =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
const validUrl = (value: string) => {
  try {
    return (
      ["http:", "https:"].includes(new URL(value, window.location.origin).protocol) &&
      !!value.trim()
    );
  } catch {
    return false;
  }
};
const avatarRow = (value: unknown): value is Avatar =>
  !!value &&
  typeof value === "object" &&
  typeof (value as Avatar).id === "string" &&
  typeof (value as Avatar).url === "string" &&
  typeof (value as Avatar).active === "boolean" &&
  ["male", "female"].includes((value as Avatar).gender) &&
  Number.isFinite((value as Avatar).sort_order);

function pendingUpload(ownerId: string | undefined): Upload | null {
  if (!ownerId || typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`owner-avatar-upload:${ownerId}`) ?? "null",
    ) as Upload | null;
    return value &&
      typeof value.url === "string" &&
      validUrl(value.url) &&
      ["male", "female"].includes(value.gender) &&
      Number.isSafeInteger(value.sort_order) &&
      value.sort_order >= 0 &&
      typeof value.uncertain === "boolean"
      ? value
      : null;
  } catch {
    return null;
  }
}

export function OwnerAvatarsEditor() {
  const { profile, refresh } = useProfile();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Avatar[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const pendingRead = useRef(false);
  const confirming = useRef(false);
  const pool = useOwnerMutation();
  const custom = useOwnerMutation();
  const [customUrl, setCustomUrl] = useState(profile?.custom_avatar_url ?? "");
  const customDirty = useRef(false);
  const [uploaded, setUploaded] = useState<Upload | null>(() => pendingUpload(profile?.id));
  const fileMale = useRef<HTMLInputElement>(null);
  const fileFemale = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!profile?.id) return;
    try {
      const key = `owner-avatar-upload:${profile.id}`;
      if (uploaded) sessionStorage.setItem(key, JSON.stringify(uploaded));
      else sessionStorage.removeItem(key);
    } catch {
      /* The visible recovery URL remains available when optional storage is blocked. */
    }
  }, [profile?.id, uploaded]);
  useEffect(() => {
    if (!customDirty.current) setCustomUrl(profile?.custom_avatar_url ?? "");
  }, [profile?.custom_avatar_url]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    pendingRead.current = true;
    const timeout = setTimeout(() => controller.abort(), 10000);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("avatar_pool")
          .select(columns)
          .order("sort_order")
          .abortSignal(controller.signal)
          .retry(false);
        if (!active) return;
        if (error || controller.signal.aborted || !Array.isArray(data) || !data.every(avatarRow))
          throw new Error("Avatar lookup failed");
        setRows(data);
        setLoadError(false);
      } catch {
        if (active) setLoadError(true);
      } finally {
        clearTimeout(timeout);
        if (active) {
          setLoading(false);
          pendingRead.current = false;
        }
      }
    })();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [revision]);
  const reload = () => {
    if (pendingRead.current || pool.saving) return;
    pendingRead.current = true;
    setLoading(true);
    setRevision((value) => value + 1);
  };
  const blocked = pool.saving || loading || loadError;
  const saved = (row: Avatar) => {
    setRows((previous) =>
      previous.some((item) => item.id === row.id)
        ? previous.map((item) => (item.id === row.id ? row : item))
        : [...previous, row],
    );
  };
  const update = (row: Avatar, patch: { url?: string; active?: boolean }) =>
    pool.run(async (signal) => {
      if (patch.url !== undefined && !validUrl(patch.url))
        throw new Error("Use a valid image URL. Your draft is retained.");
      const { data, error } = await supabase
        .from("avatar_pool")
        .update(patch)
        .eq("id", row.id)
        .select(columns)
        .abortSignal(signal)
        .maybeSingle()
        .retry(false);
      if (signal.aborted) throw new Error("Avatar update was not confirmed");
      if (error) throw new Error(error.message);
      if (!avatarRow(data) || data.id !== row.id)
        throw new Error("Avatar update was not confirmed. Your draft is retained.");
      saved(data);
      if (patch.url !== undefined) setDrafts((previous) => ({ ...previous, [row.id]: data.url }));
      toast.success("Avatar updated");
    });
  const remove = async (row: Avatar) => {
    if (confirming.current || blocked) return;
    confirming.current = true;
    try {
      if (
        !(await confirm({
          title: "Remove avatar",
          description: "Remove this avatar from the shared pool?",
          confirmText: "Remove",
          danger: true,
        }))
      )
        return;
      await pool.run(async (signal) => {
        const { data, error } = await supabase
          .from("avatar_pool")
          .delete()
          .eq("id", row.id)
          .select("id")
          .abortSignal(signal)
          .maybeSingle()
          .retry(false);
        if (signal.aborted) throw new Error("Removal was not confirmed");
        if (error) throw new Error(error.message);
        if (data?.id !== row.id)
          throw new Error("Removal was not confirmed. The avatar remains visible here.");
        setRows((previous) => previous.filter((item) => item.id !== row.id));
        toast.success("Avatar removed");
      });
    } finally {
      confirming.current = false;
    }
  };
  const register = async (draft: Upload, signal: AbortSignal) => {
    setUploaded({ ...draft, uncertain: true });
    const { data, error, status } = await supabase
      .from("avatar_pool")
      .insert({ url: draft.url, gender: draft.gender, active: true, sort_order: draft.sort_order })
      .select(columns)
      .abortSignal(signal)
      .maybeSingle()
      .retry(false);
    if (signal.aborted)
      throw new Error("Registration could not be confirmed. Check the uploaded avatar below.");
    if (error) {
      if ([400, 401, 403, 404, 409, 422].includes(status))
        setUploaded({ ...draft, uncertain: false });
      throw new Error(`${error.message}. The uploaded image URL is retained below.`);
    }
    if (!avatarRow(data) || data.url !== draft.url)
      throw new Error("Registration could not be confirmed. Check the uploaded avatar below.");
    saved(data);
    setUploaded(null);
    toast.success("Avatar added");
  };
  const upload = (file: File, gender: Avatar["gender"]) =>
    pool.run(async (signal) => {
      if (uploaded)
        throw new Error("Resolve the uploaded avatar below before uploading another image.");
      if (!file.type.startsWith("image/") || file.size === 0)
        throw new Error("Choose a non-empty image file.");
      const extension =
        file.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "") || "image";
      const path = `${gender}-${crypto.randomUUID()}.${extension}`;
      const { data: publicImage } = supabase.storage.from("avatars").getPublicUrl(path);
      const draft = {
        url: publicImage.publicUrl,
        gender,
        sort_order: Math.max(-1, ...rows.map((row) => row.sort_order)) + 1,
        uncertain: true,
      };
      setUploaded(draft);
      const { data, error } = await waitForUpload(
        supabase.storage.from("avatars").upload(path, file, { upsert: false }),
        signal,
      );
      if (signal.aborted)
        throw new Error("Image upload was not confirmed. No pool entry was added.");
      if (
        error &&
        [400, 401, 403, 404, 413, 415, 422].includes(
          Number((error as { statusCode?: string }).statusCode),
        )
      ) {
        setUploaded(null);
        throw new Error("Image upload was rejected. Choose an image and try again.");
      }
      if (signal.aborted || error || data?.path !== path)
        throw new Error("Image upload was not confirmed. No pool entry was added.");
      setUploaded(draft);
      await register(draft, signal);
    });
  const checkUpload = () =>
    pool.run(async (signal) => {
      if (!uploaded) return;
      const { data, error } = await supabase
        .from("avatar_pool")
        .select(columns)
        .eq("url", uploaded.url)
        .abortSignal(signal)
        .maybeSingle()
        .retry(false);
      if (signal.aborted || error)
        throw new Error("Could not check the uploaded avatar. Keep the URL and retry this lookup.");
      if (!avatarRow(data) || data.url !== uploaded.url)
        throw new Error(
          "No pool entry was confirmed. Keep the uploaded URL and refresh the pool before adding it again.",
        );
      saved(data);
      setUploaded(null);
      toast.success("Uploaded avatar confirmed");
    });
  const saveCustom = () =>
    custom.run(async (signal) => {
      if (!profile) throw new Error("Your profile is unavailable. Reload before saving.");
      const value = customUrl.trim();
      if (value && !validUrl(value)) throw new Error("Use a valid image URL or leave it blank.");
      const { data, error } = await supabase
        .from("profiles")
        .update({ custom_avatar_url: value || null })
        .eq("id", profile.id)
        .select("id")
        .abortSignal(signal)
        .maybeSingle()
        .retry(false);
      if (signal.aborted) throw new Error("Profile picture save was not confirmed");
      if (error) throw new Error(error.message);
      if (data?.id !== profile.id)
        throw new Error("Profile picture save was not confirmed. Your draft is retained.");
      toast.success("Profile picture saved");
      void refresh();
    });
  const dismissUpload = async () => {
    if (blocked || confirming.current) return;
    confirming.current = true;
    try {
      if (
        await confirm({
          title: "Dismiss upload recovery",
          description:
            "Keep the image URL before dismissing. This does not delete the uploaded image or change the avatar pool.",
          confirmText: "Dismiss",
        })
      )
        setUploaded(null);
    } finally {
      confirming.current = false;
    }
  };
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="owner-picture-title"
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 id="owner-picture-title" className="text-xl font-bold">
          My profile picture
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A custom image for your account. Leave blank to use your regular avatar.
        </p>
        {custom.error && (
          <p role="alert" className="mt-3 break-words text-sm text-destructive">
            {custom.error}
          </p>
        )}
        <fieldset
          disabled={custom.saving}
          aria-busy={custom.saving}
          className="mt-4 min-w-0 space-y-3"
        >
          <legend className="sr-only">Custom profile picture</legend>
          <label className="block text-sm">
            Custom avatar URL
            <input
              className={input}
              value={customUrl}
              onChange={(event) => {
                customDirty.current = true;
                setCustomUrl(event.target.value);
              }}
            />
          </label>
          <Button onClick={() => void saveCustom()} disabled={!profile}>
            Save profile picture
          </Button>
        </fieldset>
      </section>
      <section
        aria-labelledby="owner-pool-title"
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 id="owner-pool-title" className="text-xl font-bold">
          Avatar pool
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Images available in the shared avatar picker. Edit a URL, then save it explicitly.
        </p>
        {loadError && (
          <div role="alert" className="mt-3 text-sm text-destructive">
            Could not load the avatar pool. Existing rows and drafts are retained.{" "}
            <Button variant="outline" disabled={loading} onClick={reload}>
              Retry avatar pool
            </Button>
          </div>
        )}
        {pool.error && (
          <p role="alert" className="mt-3 break-words text-sm text-destructive">
            {pool.error}
          </p>
        )}
        {loading && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Loading avatar pool…
          </p>
        )}
        <fieldset disabled={blocked} aria-busy={pool.saving} className="mt-4 min-w-0 space-y-4">
          <legend className="sr-only">Shared avatar management</legend>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileMale}
              aria-label="Male avatar image"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={!!uploaded}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, "male");
                event.target.value = "";
              }}
            />
            <input
              ref={fileFemale}
              aria-label="Female avatar image"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={!!uploaded}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, "female");
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              disabled={!!uploaded}
              onClick={() => fileMale.current?.click()}
            >
              Add male avatar
            </Button>
            <Button
              variant="outline"
              disabled={!!uploaded}
              onClick={() => fileFemale.current?.click()}
            >
              Add female avatar
            </Button>
          </div>
          {uploaded && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm">
                Image upload or shared-pool registration still needs confirmation. Keep this URL if
                you leave the page.
              </p>
              <label className="block text-sm">
                Uploaded image URL
                <input readOnly className={input} value={uploaded.url} />
              </label>
              <Button variant="outline" onClick={() => void checkUpload()}>
                Check uploaded avatar
              </Button>
              <Button variant="outline" onClick={() => void dismissUpload()}>
                Dismiss upload recovery
              </Button>
              {!uploaded.uncertain && (
                <Button onClick={() => void pool.run((signal) => register(uploaded, signal))}>
                  Retry adding avatar
                </Button>
              )}
            </div>
          )}
          {!loading && !loadError && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No avatars yet — upload an image above.</p>
          )}
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {rows.map((row, index) => {
              const label = row.label?.trim() || `Avatar ${index + 1}`;
              return (
                <div
                  key={row.id}
                  role="group"
                  aria-label={label}
                  className="min-w-0 space-y-3 rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={row.url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <p className="min-w-0 break-words text-sm font-semibold">
                      {label} · {row.gender}
                    </p>
                  </div>
                  <label className="block text-sm">
                    Image URL
                    <input
                      className={input}
                      value={drafts[row.id] ?? row.url}
                      onChange={(event) =>
                        setDrafts((previous) => ({ ...previous, [row.id]: event.target.value }))
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void update(row, { url: (drafts[row.id] ?? row.url).trim() })}
                    >
                      Save URL
                    </Button>
                    <Button
                      variant="outline"
                      aria-pressed={row.active}
                      onClick={() => void update(row, { active: !row.active })}
                    >
                      {row.active ? "Hide avatar" : "Show avatar"}
                    </Button>
                    <Button variant="outline" onClick={() => void remove(row)}>
                      Remove avatar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      </section>
    </div>
  );
}
