import { useEffect, useRef, useState } from "react";
import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useAutosave } from "@/hooks/useAutosave";
import { readOwnerConfig, saveOwnerSetting } from "@/lib/ownerSettings";
import {
  nativeUi,
  NATIVE_LINKS,
  NATIVE_TEXT_FIELDS,
  validateNativeUi,
  type NativeUi,
} from "@/lib/nativeAppConfig";
import { Button } from "@/components/ui/button";

const read = (signal: AbortSignal) =>
  readOwnerConfig(["Ui", "Links", "TutorialUrl", "Title", "Texts", "DexBranding"], signal);
export function NativeAppEditor() {
  const resource = useOwnerResource(read);
  const [initialized, setInitialized] = useState(false);
  const [draft, setDraft] = useState<NativeUi>(() => nativeUi(null, {}));
  const [saved, setSaved] = useState<NativeUi>(() => nativeUi(null, {}));
  const snapshot = useRef<unknown>(undefined);
  useEffect(() => {
    if (resource.data) {
      snapshot.current = resource.data.Ui;
      setDraft(nativeUi(resource.data.Ui, resource.data));
      setSaved(nativeUi(resource.data.Ui, resource.data));
      setInitialized(true);
    }
  }, [resource.data]);
  const autosave = useAutosave({
    value: draft,
    ready: initialized && !!resource.data && !resource.loading,
    validate: validateNativeUi,
    baseline: nativeUi(resource.data?.Ui, resource.data ?? {}),
    save: async (next) => {
      await saveOwnerSetting(
        "app_config",
        "Ui",
        next,
        snapshot.current,
        AbortSignal.timeout(10000),
      );
      snapshot.current = next;
      setSaved(next);
    },
  });
  if (resource.loading) return <p role="status">Loading app settings…</p>;
  if (resource.error)
    return (
      <div role="alert">
        {resource.error}
        <Button onClick={resource.reload}>Retry app settings</Button>
      </div>
    );
  const field = (label: string, value: string, change: (value: string) => void) => (
    <label className="block space-y-1" key={label}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2"
        value={value}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  );
  const labels: Record<string, string> = {
    title: "Heading",
    edition: "Edition label",
    securitySubtitle: "Security subtitle",
    getKeyLabel: "Get Key button text",
    adminLabel: "Admin button text",
    verifyLabel: "Verify button text",
    tutorialLabel: "Tutorial button text",
    keyPlaceholder: "Key input placeholder",
    deviceNote: "Device information text",
    onlineNote: "Online verification text",
    sectionTitle: "Community page heading",
    sectionDescription: "Community page introduction",
    eyebrow: "Stay Connected subtitle",
    description: "Community description",
    loadingText: "Links loading message",
    unavailableText: "Links unavailable message",
    retryLabel: "Retry button text",
    checkingTitle: "Availability check heading",
    checkingMessage: "Availability check message",
    maintenanceTitle: "Maintenance dialog heading",
    maintenanceMessage: "Maintenance message",
    closeLabel: "Close button text",
    unavailableTitle: "Offline dialog heading",
    unavailableMessage: "Offline message",
    laterLabel: "Optional update continue text",
  };
  const preview = (id: string, title: string) => {
    const url = saved.links[id];
    const unavailable =
      !url?.trim() ||
      !!validateNativeUi(saved) ||
      JSON.stringify(draft) !== JSON.stringify(saved) ||
      autosave.saving ||
      !!autosave.error;
    return (
      <Button
        type="button"
        variant="outline"
        disabled={unavailable}
        aria-label={`Open saved ${title} link`}
        onClick={() => window.open(url.trim(), "_blank", "noopener,noreferrer")}
      >
        Open saved link
      </Button>
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="font-bold">Royal Black app content</h2>
          <p className="text-sm text-muted-foreground">
            Changes save automatically after you finish typing.
          </p>
          <p role="status" className="text-sm">
            {autosave.status}
          </p>
          {autosave.error && (
            <p role="alert" className="text-sm text-destructive">
              {autosave.error}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={autosave.saving} onClick={resource.reload}>
            Reload saved settings
          </Button>
          <Button disabled={autosave.saving} onClick={() => void autosave.saveNow()}>
            Save app config
          </Button>
        </div>
      </div>
      <section
        className="rounded-2xl border border-border bg-card p-5"
        aria-labelledby="native-login-buttons"
      >
        <h3 id="native-login-buttons" className="mb-2 text-lg font-bold">
          Login buttons
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Edit each button and its destination together. Leave a URL empty to disable that action in
          the updated DEX. Saved links can be tested after changes finish saving.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["getkey", "Get Key", "getKeyLabel", "Get Key URL"],
              ["admin", "Admin", "adminLabel", "Admin URL"],
              ["tutorial", "Tutorial & Help", "tutorialLabel", "Tutorial URL"],
            ] as const
          ).map(([id, title, key, urlLabel]) => (
            <div key={id} className="min-w-0 space-y-3 rounded-xl border border-border p-4">
              <h4 className="font-semibold">{title}</h4>
              {field(labels[key], draft.login[key], (text) =>
                setDraft((v) => ({ ...v, login: { ...v.login, [key]: text } })),
              )}
              {field(urlLabel, draft.links[id], (text) =>
                setDraft((v) => ({ ...v, links: { ...v.links, [id]: text } })),
              )}
              <p className="text-xs text-muted-foreground">
                {id === "admin"
                  ? "Use any public HTTPS destination you choose. No owner sign-in or contact address is assumed."
                  : id === "getkey"
                    ? "Keep your existing generator link unless you intend to change the key flow."
                    : "Open your tutorial or support page."}
              </p>
              {preview(id, title)}
            </div>
          ))}
          <div className="min-w-0 space-y-3 rounded-xl border border-border p-4">
            <h4 className="font-semibold">Login / Verify</h4>
            {field(labels.verifyLabel, draft.login.verifyLabel, (text) =>
              setDraft((v) => ({ ...v, login: { ...v.login, verifyLabel: text } })),
            )}
            <p className="text-sm text-muted-foreground">
              Verifies the entered key inside the APK. This button has no website URL.
            </p>
          </div>
        </div>
      </section>
      {Object.entries(NATIVE_TEXT_FIELDS).map(([group, fields]) => (
        <section key={group} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-lg font-bold capitalize">
            {group === "policy"
              ? "Availability dialogs"
              : group === "brand"
                ? "DEX branding"
                : group}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.keys(fields)
              .filter(
                (key) =>
                  group !== "login" ||
                  !["getKeyLabel", "adminLabel", "verifyLabel", "tutorialLabel"].includes(key),
              )
              .map((key) =>
                field(
                  labels[key] ?? key,
                  draft[group as "brand" | "login" | "community" | "policy"][key],
                  (text) =>
                    setDraft((v) => ({
                      ...v,
                      [group]: {
                        ...v[group as "brand" | "login" | "community" | "policy"],
                        [key]: text,
                      },
                    })),
                ),
              )}
          </div>
        </section>
      ))}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-2 text-lg font-bold">Shared social links</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          The five social icons use these same links on login and Stay Connected. Icons stay the
          same when labels change.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {NATIVE_LINKS.filter(([id]) => !["getkey", "admin", "tutorial"].includes(id)).map(
            ([id, label]) => (
              <div key={id} className="min-w-0 space-y-3">
                {field(label, draft.links[id], (text) =>
                  setDraft((v) => ({ ...v, links: { ...v.links, [id]: text } })),
                )}
                {preview(id, label)}
              </div>
            ),
          )}
        </div>
        <h3 className="my-4 font-bold">Social button labels</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(draft.social.labels).map((id) =>
            field(`${id} label`, draft.social.labels[id], (text) =>
              setDraft((v) => ({ ...v, social: { labels: { ...v.social.labels, [id]: text } } })),
            ),
          )}
        </div>
      </section>
    </div>
  );
}
