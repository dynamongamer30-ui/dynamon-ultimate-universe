import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { featureRpc } from "@/lib/featureRpc";
import { normalizeDiscoverySearch, type DiscoverySearch } from "@/lib/modDiscovery";
type Saved = { id: string; name: string; preset: DiscoverySearch };
const localKey = "dg:guest-saved-searches:v1";
export function SavedSearches({
  search,
  open,
}: {
  search: DiscoverySearch;
  open: (search: DiscoverySearch) => void;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const identity = useRef(userId);
  identity.current = userId;
  const locked = useRef(false);
  const [rows, setRows] = useState<Saved[]>([]);
  const [scope, setScope] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setRows([]);
    setError("");
    setName("");
    setBusy(false);
    locked.current = false;
    const load = async () => {
      try {
        const data = userId
          ? await featureRpc<Saved[]>("website_saved_searches", { p_action: "list" })
          : JSON.parse(localStorage.getItem(localKey) || "[]");
        if (
          !Array.isArray(data) ||
          data.some(
            (r) =>
              typeof r?.id !== "string" ||
              typeof r?.name !== "string" ||
              !r.preset ||
              typeof r.preset !== "object",
          )
        )
          throw Error("Saved searches could not be read. Retry loading.");
        if (active) {
          setRows(data.slice(0, 10));
          setScope(userId || "guest");
        }
      } catch (c) {
        if (active) setError(c instanceof Error ? c.message : "Saved searches unavailable.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId, revision]);
  const mutate = async (action: "save" | "remove" | "rename", id?: string) => {
    if (locked.current) return;
    locked.current = true;
    const actor = userId;
    setBusy(true);
    setError("");
    try {
      if (user) {
        await featureRpc("website_saved_searches", {
          p_action: action,
          p_id: id ?? null,
          p_name: name.trim(),
          p_preset: normalizeDiscoverySearch(search),
        });
        if (identity.current !== actor) return;
        setRevision((n) => n + 1);
      } else {
        let next = rows;
        if (action === "remove") next = rows.filter((r) => r.id !== id);
        else if (action === "rename") {
          if (!name.trim()) throw Error("Type a new name above first.");
          next = rows.map((r) => (r.id === id ? { ...r, name: name.trim().slice(0, 60) } : r));
        } else {
          if (!name.trim()) throw Error("Name this search first.");
          if (rows.length >= 10) throw Error("Remove one of your ten saved searches first.");
          next = [
            ...rows,
            {
              id: crypto.randomUUID(),
              name: name.trim().slice(0, 60),
              preset: normalizeDiscoverySearch(search),
            },
          ];
        }
        localStorage.setItem(localKey, JSON.stringify(next));
        setRows(next);
      }
      if (identity.current === actor) setName("");
    } catch (c) {
      if (identity.current === actor) setError(c instanceof Error ? c.message : "Could not save.");
    } finally {
      if (identity.current === actor) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <details className="mt-5 rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Saved searches{" "}
        <span className="text-muted-foreground">· {user ? "Your account" : "This device"}</span>
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        Save up to ten filter presets. To rename, type a name then choose Rename.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          aria-label="Saved search name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this search"
          className="control-input min-h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm"
        />
        <button
          disabled={busy || !name.trim()}
          onClick={() => void mutate("save")}
          className="touch-target rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          Save search
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}{" "}
          <button onClick={() => setRevision((n) => n + 1)} className="underline">
            Retry
          </button>
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {(scope === (userId || "guest") ? rows : []).map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
          >
            <button
              onClick={() => open(normalizeDiscoverySearch(row.preset))}
              className="touch-target min-w-0 flex-1 truncate px-2 text-left text-sm font-semibold"
            >
              {row.name}
            </button>
            <button
              disabled={busy}
              onClick={() => void mutate("rename", row.id)}
              className="touch-target px-2 text-xs"
            >
              Rename
            </button>
            <button
              disabled={busy}
              onClick={() => void mutate("remove", row.id)}
              className="touch-target px-2 text-xs"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
