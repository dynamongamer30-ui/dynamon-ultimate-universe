import { useRef, useState, type ReactNode } from "react";
import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useAutosave } from "@/hooks/useAutosave";
import { readOwnerConfig, saveOwnerSetting } from "@/lib/ownerSettings";
import { DEFAULT_APP_UPDATE } from "@/lib/dgData";
import { Button } from "@/components/ui/button";

const ids = ["Maintenance", "RateLimit", "KeyDurationHours", "IPWhitelist", "Update"];
const read = async (signal: AbortSignal) => {
  const rows = await readOwnerConfig(ids, signal);
  if (
    (rows.Maintenance != null && typeof rows.Maintenance !== "boolean") ||
    (rows.KeyDurationHours != null &&
      (!Number.isSafeInteger(rows.KeyDurationHours) || Number(rows.KeyDurationHours) < 1)) ||
    (rows.RateLimit != null &&
      (typeof rows.RateLimit !== "object" ||
        Array.isArray(rows.RateLimit) ||
        typeof (rows.RateLimit as { enabled?: unknown }).enabled !== "boolean")) ||
    (rows.IPWhitelist != null &&
      (!Array.isArray(rows.IPWhitelist) ||
        rows.IPWhitelist.some((v: unknown) => typeof v !== "string"))) ||
    (rows.Update != null && (typeof rows.Update !== "object" || Array.isArray(rows.Update)))
  )
    throw new Error("Invalid saved configuration. Reload saved settings before editing.");
  return rows;
};
function Setting<T>({
  id,
  initial,
  expected,
  validate,
  children,
}: {
  id: string;
  initial: T;
  expected: unknown;
  validate?: (value: T) => string | null;
  children: (value: T, update: (next: T) => void) => ReactNode;
}) {
  const [draft, update] = useState(initial);
  const snapshot = useRef(expected);
  const autosave = useAutosave({
    value: draft,
    ready: true,
    validate,
    save: async (value) => {
      await saveOwnerSetting("app_config", id, value, snapshot.current, AbortSignal.timeout(10000));
      snapshot.current = value;
    },
  });
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
      {children(draft, update)}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span role="status" className="text-sm text-muted-foreground">
          {autosave.status}
        </span>
        <Button
          variant="outline"
          disabled={autosave.saving}
          onClick={() => void autosave.saveNow()}
        >
          Save now
        </Button>
      </div>
      {autosave.error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {autosave.error}
        </p>
      )}
    </section>
  );
}
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2";
const label = (
  title: string,
  value: string | number,
  change: (text: string) => void,
  number = false,
) => (
  <label className="block text-sm" key={title}>
    {title}
    <input
      className={input}
      type={number ? "number" : "text"}
      value={value}
      onChange={(e) => change(e.target.value)}
    />
  </label>
);
const toggle = (title: string, on: boolean, change: (on: boolean) => void) => (
  <label className="flex min-h-11 items-center gap-3 font-semibold">
    <input
      type="checkbox"
      role="switch"
      aria-label={title}
      checked={on}
      onChange={(e) => change(e.target.checked)}
    />
    {title}
  </label>
);
function validIp(value: string) {
  if (value.includes(":")) {
    try {
      new URL(`https://[${value}]/`);
      return true;
    } catch {
      return false;
    }
  }
  const p = value.split(".");
  return p.length === 4 && p.every((v) => /^\d{1,3}$/.test(v) && Number(v) <= 255);
}
export function NativeConfigEditor() {
  const resource = useOwnerResource(read);
  if (resource.loading) return <p role="status">Loading generator settings…</p>;
  if (resource.error || !resource.data)
    return (
      <div role="alert">
        {resource.error}
        <Button onClick={resource.reload}>Retry generator settings</Button>
      </div>
    );
  const rows = resource.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Changes save automatically. Maintenance and mandatory updates are checked before DEX
          login.
        </p>
        <Button variant="outline" onClick={resource.reload}>
          Reload saved settings
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Setting id="Maintenance" initial={rows.Maintenance === true} expected={rows.Maintenance}>
          {(value, update) => (
            <>
              {toggle("Maintenance mode", value, update)}
              <p className="mt-2 text-sm text-muted-foreground">
                Blocks key generation and DEX verification. The availability dialog appears before
                key entry.
              </p>
            </>
          )}
        </Setting>
        <Setting
          id="RateLimit"
          initial={{ enabled: false, ...((rows.RateLimit as object) ?? {}) }}
          expected={rows.RateLimit}
        >
          {(value, update) => (
            <>
              {toggle("Rate limiting", value.enabled, (enabled) => update({ ...value, enabled }))}
              <p className="mt-2 text-sm text-muted-foreground">
                Apply the existing server limits to key generation. Whitelisted IPs bypass these
                limits.
              </p>
            </>
          )}
        </Setting>
        <Setting
          id="KeyDurationHours"
          initial={Number(rows.KeyDurationHours ?? 24)}
          expected={rows.KeyDurationHours}
          validate={(v) =>
            Number.isSafeInteger(v) && v >= 1 && v <= 168 ? null : "Use 1–168 whole hours."
          }
        >
          {(value, update) =>
            label("Generated key duration (hours)", value, (v) => update(Number(v)), true)
          }
        </Setting>
        <Setting
          id="IPWhitelist"
          initial={(Array.isArray(rows.IPWhitelist) ? rows.IPWhitelist : []) as string[]}
          expected={rows.IPWhitelist}
          validate={(v) =>
            v.length <= 100 && v.every(validIp)
              ? null
              : "Enter at most 100 complete IPv4 or IPv6 addresses, one per line."
          }
        >
          {(value, update) => (
            <label className="block text-sm">
              IP whitelist
              <textarea
                className={input}
                rows={4}
                value={value.join("\n")}
                onChange={(e) => update(e.target.value.split("\n"))}
                onBlur={() => update(value.map((v) => v.trim()).filter(Boolean))}
              />
              <span className="text-xs text-muted-foreground">
                One address per line. Leave empty to whitelist nobody.
              </span>
            </label>
          )}
        </Setting>
        <div className="lg:col-span-2">
          <Setting
            id="Update"
            initial={{ ...DEFAULT_APP_UPDATE, Force: false, ...((rows.Update as object) ?? {}) }}
            expected={rows.Update}
            validate={(v) => {
              if (!Number.isSafeInteger(v.VersionCode) || v.VersionCode < 0)
                return "Use a non-negative whole version code.";
              if (v.Enabled) {
                try {
                  const url = new URL(v.UpdateUrl);
                  if (url.protocol !== "https:" || url.username || url.password) throw Error();
                } catch {
                  return "Add a valid HTTPS update link before enabling updates.";
                }
                if (v.VersionCode < 1) return "Set a target version code before enabling updates.";
              }
              return null;
            }}
          >
            {(value, update) => (
              <>
                <h3 className="mb-4 text-lg font-bold">App update system</h3>
                {toggle("Update enabled", value.Enabled, (Enabled) =>
                  update({ ...value, Enabled }),
                )}
                {toggle("Mandatory update", value.Force, (Force) => update({ ...value, Force }))}
                <p className="mb-4 text-sm text-muted-foreground">
                  When mandatory, older APK versions cannot reach login. Optional updates offer a
                  Continue button.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries({
                    VersionCode: "Target APK version code",
                    VersionName: "Version name",
                    Title: "Dialog title",
                    Subtitle: "Dialog subtitle",
                    WhatsNew: "What’s new",
                    UpdateUrl: "Update URL",
                    BtnText: "Update button label",
                  }).map(([key, title]) =>
                    label(
                      title,
                      value[key as keyof typeof value] as string | number,
                      (v) => update({ ...value, [key]: key === "VersionCode" ? Number(v) : v }),
                      key === "VersionCode",
                    ),
                  )}
                </div>
              </>
            )}
          </Setting>
        </div>
      </div>
    </div>
  );
}
