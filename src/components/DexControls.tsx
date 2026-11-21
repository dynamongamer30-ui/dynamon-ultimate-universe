import { useEffect, useRef, useState } from "react";
import { getConfigNode, compareConfigNode } from "@/lib/dgData";
import { useAutosave } from "@/hooks/useAutosave";
import { Button } from "@/components/ui/button";
import { DexThemes } from "@/components/DexThemes";
type Control = [string, string];
const GROUPS: { title: string; controls: Control[] }[] = [
  {
    title: "Master switches",
    controls: [
      ["app", "Block game payload loading"],
      ["mods", "Block all mod access"],
    ],
  },
  {
    title: "Fun Mode",
    controls: [["funMode", "Fun Mode (new Dynamon, abilities, Nightmare, all custom content)"]],
  },
  {
    title: "Battle",
    controls: [
      ["god", "God mode"],
      ["oneHit", "One-hit damage"],
      ["crit", "Critical hits"],
      ["statusImmune", "Status immunity"],
      ["noCD", "No cooldowns"],
      ["alwaysCatch", "Always catch"],
      ["fullheal", "Full-heal potions"],
      ["speed", "Battle speed"],
      ["advisor", "Battle advisor card"],
      ["canEditor", "Can editor and presets"],
    ],
  },
  {
    title: "Arena",
    controls: [
      ["botMatch", "Bot matchmaking"],
      ["winTrophy", "Win bot matches"],
      ["noTrophyLoss", "No trophy loss"],
      ["pvpcd", "Faster arena items"],
      ["itemtimer", "No item wait"],
      ["turnreset", "Refill items each turn"],
      ["items5", "Five items per turn"],
      ["autoGrind", "Arena automation"],
    ],
  },
  {
    title: "Team",
    controls: [
      ["party", "Party size"],
      ["teamEditor", "Team stats"],
      ["teamAdvise", "Team builder, advisor teams and enemy picker"],
    ],
  },
  {
    title: "Items and economy",
    controls: [
      ["setCoins", "Set coins"],
      ["setDust", "Set dust"],
      ["items", "Inventory edits"],
      ["nicklen", "Longer nicknames"],
      ["nickval", "Name validation"],
    ],
  },
  {
    title: "Unlocks",
    controls: [
      ["fastStart", "Fast start"],
      ["unlock", "All unlock categories"],
      ["unlockMons", "Collection entries"],
      ["unlockSkins", "Skin unlocks"],
      ["unlockEmotes", "Emote unlocks"],
      ["unlockAvatars", "Avatar unlocks"],
      ["unlockWorlds", "All worlds"],
      ["giveMon", "Dynamon giver"],
      ["perks", "Perks: No Ads, unlimited snacks and heal, battle speed, 4x XP"],
    ],
  },
  {
    title: "World",
    controls: [
      ["autoWorld", "Auto World"],
      ["skins", "Skin editor and reset"],
    ],
  },
];
const CONTROLS: Control[] = GROUPS.flatMap((g) => g.controls);

export function DexControls() {
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const snapshot = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
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
  const lockedCount = CONTROLS.filter(([key]) => locks[key] === true).length;
  const setAll = (value: boolean) =>
    setLocks({
      ...locks,
      // Master switches stay as they are so "Lock all" can never shut the whole mod off.
      ...Object.fromEntries(
        CONTROLS.filter(([key]) => key !== "app" && key !== "mods").map(([key]) => [key, value]),
      ),
    });
  if (loading) return <p>Loading DEX settings…</p>;
  if (failed) return <p role="alert">Could not read DEX settings. Reload before editing.</p>;
  return (
    <div className="space-y-6">
      <DexThemes />
      <section className="rounded-2xl border border-[#d4af37]/30 bg-[#0a0a0f] p-5 text-[#f5f0e1] shadow-[0_0_40px_rgba(124,58,237,0.15)]">
        <h2 className="text-xl font-bold text-[#d4af37]">
          Royal Black feature access ({CONTROLS.length} controls)
        </h2>
        <p className="my-3 text-sm text-[#b8b2c8]">
          Switch on = locked. Changes save automatically and apply on the next game launch.
          Everything starts unlocked.
        </p>
        <p className="mb-4 text-xs text-[#8a84a0]">
          Shop compatibility is always enabled in the current DEX. Retired stat and defense
          overrides are not exposed.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            aria-label="Search features"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features"
            className="min-h-11 flex-1 rounded-xl border border-[#7c3aed]/40 bg-black px-3 text-sm outline-none focus:border-[#d4af37]"
          />
          <Button type="button" variant="outline" onClick={() => setAll(true)}>
            Lock all
          </Button>
          <Button type="button" variant="outline" onClick={() => setAll(false)}>
            Unlock all
          </Button>
          <span className="text-xs text-[#d4af37]">{lockedCount} locked</span>
        </div>
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const shown = group.controls.filter(([key, label]) =>
              `${key} ${label}`.toLowerCase().includes(query.trim().toLowerCase()),
            );
            if (!shown.length) return null;
            return (
              <div key={group.title}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
                  {group.title}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {shown.map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 ${locks[key] === true ? "border-rose-500/50 bg-rose-950/30" : "border-[#7c3aed]/25 bg-black/60"}`}
                    >
                      <input
                        type="checkbox"
                        checked={locks[key] === true}
                        onChange={(e) => setLocks({ ...locks, [key]: e.target.checked })}
                      />
                      <span className="flex-1 text-sm">{label}</span>
                      <span className="text-xs">{locks[key] === true ? "Locked" : "Unlocked"}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
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
