import { useEffect, useRef, useState } from "react";
import { getConfigNode, compareConfigNode } from "@/lib/dgData";
import { useAutosave } from "@/hooks/useAutosave";
import { Button } from "@/components/ui/button";
import { DexThemes } from "@/components/DexThemes";
const CONTROLS: [string, string][] = [
  ["app", "Block game payload loading"],
  ["mods", "Block all mod access"],
  ["god", "God mode"],
  ["oneHit", "One-hit damage"],
  ["crit", "Critical hits"],
  ["statusImmune", "Status immunity"],
  ["noCD", "No cooldowns"],
  ["alwaysCatch", "Always catch"],
  ["botMatch", "Bot matchmaking"],
  ["winTrophy", "Win bot matches"],
  ["noTrophyLoss", "No trophy loss"],
  ["fullheal", "Full-heal potions"],
  ["pvpcd", "Faster arena items"],
  ["itemtimer", "No item wait"],
  ["turnreset", "Refill items each turn"],
  ["items5", "Five items per turn"],
  ["nicklen", "Longer nicknames"],
  ["nickval", "Name validation"],
  ["speed", "Speed"],
  ["setCoins", "Set coins"],
  ["setDust", "Set dust"],
  ["items", "Inventory edits"],
  ["party", "Party size"],
  ["teamEditor", "Team stats"],
  ["skins", "Skin editor and reset"],
  ["autoWorld", "Auto World"],
  ["autoGrind", "Arena automation"],
  ["unlock", "All unlock categories"],
  ["unlockMons", "Collection entries"],
  ["unlockSkins", "Skin unlocks"],
  ["unlockEmotes", "Emote unlocks"],
  ["unlockAvatars", "Avatar unlocks"],
];

export function DexControls() {
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const snapshot = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    getConfigNode<Record<string, boolean>>("FeatureLocks")
      .then((value) => {
        if (active) {
          snapshot.current = value;
          setLocks(value || {});
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const autosave = useAutosave({
    value: locks,
    ready: !loading && !failed,
    save: async (next) => {
      await compareConfigNode("FeatureLocks", next, snapshot.current);
      snapshot.current = next;
    },
  });
  if (loading) return <p>Loading DEX settings…</p>;
  if (failed) return <p role="alert">Could not read DEX settings. Reload before editing.</p>;
  return (
    <div className="space-y-6">
      <DexThemes />
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold">
          Royal Black feature access ({CONTROLS.length} controls)
        </h2>
        <p className="my-3 text-sm text-muted-foreground">
          Checked means locked. Changes save automatically and apply on the next game launch.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Shop compatibility is always enabled in the current DEX. Retired stat and defense
          overrides are not exposed.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTROLS.map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={locks[key] === true}
                onChange={(e) => setLocks({ ...locks, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p role="status" className="mt-4 text-sm">
          {autosave.status}
        </p>
        {autosave.error && (
          <p role="alert" className="text-sm text-destructive">
            {autosave.error}
          </p>
        )}
        <Button className="mt-3" disabled={autosave.saving} onClick={() => void autosave.saveNow()}>
          Save feature locks
        </Button>
      </section>
      <p className="text-sm text-muted-foreground">
        Edit shared DEX login text, branding and the five community links in the App section.
      </p>
    </div>
  );
}
