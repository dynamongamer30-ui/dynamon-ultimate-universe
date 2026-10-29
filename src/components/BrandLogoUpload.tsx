import { useEffect, useRef, useState } from "react";
import { MAX_BRAND_LOGO_BYTES, removeUnusedBrandLogo } from "@/lib/brandLogoStorage";
import { supabase } from "@/integrations/supabase/client";

function confirmedWithin<T>(pending: PromiseLike<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Upload confirmation timed out. Your current logo is unchanged; retry when connected.",
          ),
        ),
      milliseconds,
    );
    Promise.resolve(pending).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function BrandLogoUpload({
  current,
  onPublish,
}: {
  current: string;
  onPublish: (url: string, icon: boolean) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [alsoIcon, setAlsoIcon] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const upload = async () => {
    if (!file || busy) return;
    const run = ++generation.current;
    setBusy(true);
    setError("");
    setMessage("");
    let bitmap: ImageBitmap | undefined;
    let staged: { url: string; owner: string } | undefined;
    try {
      const {
        data: { user },
      } = await confirmedWithin(supabase.auth.getUser(), 15000);
      if (!user) throw new Error("Sign in again before uploading.");
      const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => signature[i] === n);
      const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
      const webp =
        String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
      if (!png && !jpeg && !webp) throw Error("Choose a valid PNG, JPEG or WebP image.");
      bitmap = await createImageBitmap(file);
      if (
        Math.min(bitmap.width, bitmap.height) < 64 ||
        Math.max(bitmap.width, bitmap.height) > 8192
      )
        throw new Error("Choose an image between 64 and 8192 pixels on each side.");
      const side = Math.min(bitmap.width, bitmap.height) / zoom;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing unavailable.");
      context.drawImage(
        bitmap,
        ((bitmap.width - side) * x) / 100,
        ((bitmap.height - side) * y) / 100,
        side,
        side,
        0,
        0,
        512,
        512,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("Could not prepare image."))),
          "image/webp",
          0.9,
        ),
      );
      const path = `branding/${user.id}/${crypto.randomUUID()}.webp`;
      // Existing owner-only avatars policy also protects this branding prefix.
      const { error: uploadError } = await confirmedWithin(
        supabase.storage.from("avatars").upload(path, blob, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "31536000",
        }),
        30000,
      );
      if (uploadError) throw new Error(uploadError.message);
      const {
        data: { user: stillUser },
      } = await confirmedWithin(supabase.auth.getUser(), 15000);
      if (run !== generation.current || stillUser?.id !== user.id) return;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      staged = { url: data.publicUrl, owner: user.id };
      await onPublish(data.publicUrl, alsoIcon);
      setMessage("Logo published successfully.");
      try {
        await removeUnusedBrandLogo(supabase, current, user.id);
      } catch {
        setMessage(
          "Logo published. The previous file could not be removed; please retry when connected.",
        );
      }
    } catch (cause) {
      // A failed or uncertain save may already have committed: reread references first.
      if (staged) await removeUnusedBrandLogo(supabase, staged.url, staged.owner).catch(() => {});
      if (run === generation.current)
        setError(cause instanceof Error ? cause.message : "Upload failed. Retry when ready.");
    } finally {
      bitmap?.close();
      if (run === generation.current) setBusy(false);
    }
  };
  return (
    <fieldset disabled={busy} className="rounded-2xl border border-border bg-background/40 p-5">
      <legend className="px-2 text-sm font-bold">Upload website logo</legend>
      <div className="flex flex-wrap items-center gap-5">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-card">
          <img
            src={file ? preview : current}
            alt="Circular website logo preview"
            className="h-full w-full object-cover"
            style={
              file
                ? {
                    transform: `scale(${zoom})`,
                    objectPosition: `${x}% ${y}%`,
                    transformOrigin: `${x}% ${y}%`,
                  }
                : undefined
            }
          />
        </div>
        <label className="text-sm">
          Choose PNG, JPEG or WebP (up to 15 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-3 block min-h-11 w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-card file:px-4 file:py-3 file:font-semibold file:text-foreground"
            onChange={(event) => {
              const next = event.target.files?.[0];
              setError("");
              setMessage("");
              if (!next) return;
              if (
                !(
                  ["image/png", "image/jpeg", "image/webp"].includes(next.type) ||
                  (!next.type && /\.(png|jpe?g|webp)$/i.test(next.name))
                ) ||
                next.size > MAX_BRAND_LOGO_BYTES
              ) {
                setFile(null);
                setError("Choose a PNG, JPEG or WebP of 15 MB or less.");
                return;
              }
              setFile(next);
              setZoom(1);
              setX(50);
              setY(50);
            }}
          />
        </label>
      </div>
      {file && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Zoom", zoom, 1, 3, 0.05, setZoom],
            ["Horizontal crop", x, 0, 100, 1, setX],
            ["Vertical crop", y, 0, 100, 1, setY],
          ].map(([label, value, min, max, step, set]) => (
            <label key={String(label)} className="text-xs">
              {String(label)}
              <input
                aria-label={String(label)}
                type="range"
                value={value as number}
                min={min as number}
                max={max as number}
                step={step as number}
                onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
          ))}
        </div>
      )}
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={alsoIcon} onChange={(e) => setAlsoIcon(e.target.checked)} />
        Also use as website icon
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void upload()}
          className="touch-target rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Uploading…" : error ? "Retry upload" : "Upload and use image"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBusy(true);
            setError("");
            setMessage("");
            void onPublish("/dynamon-gamer-avatar.png", alsoIcon)
              .then(async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user) await removeUnusedBrandLogo(supabase, current, user.id);
                setFile(null);
                setMessage("Default logo published.");
              })
              .catch((cause) =>
                setError(cause instanceof Error ? cause.message : "Publication failed."),
              )
              .finally(() => setBusy(false));
          }}
          className="touch-target rounded-xl border border-border px-4 py-2 text-sm"
        >
          Restore default
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        The share-preview image stays separate. Browser icons may be cached; search engines update
        after recrawling.
      </p>
    </fieldset>
  );
}
