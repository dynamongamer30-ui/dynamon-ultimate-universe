import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Columns3, X } from "lucide-react";
import type { Mod } from "@/lib/mods";
import { formatCount, elementTheme } from "@/lib/mods";

export function BuildComparison({
  builds,
  remove,
  clear,
}: {
  builds: Mod[];
  remove: (slug: string) => void;
  clear: () => void;
}) {
  const [differences, setDifferences] = useState(false);
  const [share, setShare] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!builds.length) return null;
  const features = [...new Set(builds.flatMap((build) => build.features))];
  return (
    <>
      <aside className="comparison-tray" aria-label="Selected builds for comparison">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Columns3 size={18} aria-hidden="true" />
          <span className="text-sm font-semibold">{builds.length}/3 selected</span>
          {builds.map((build) => (
            <button
              key={build.slug}
              onClick={() => remove(build.slug)}
              className="comparison-chip"
              aria-label={`Remove ${build.name} from comparison`}
            >
              {build.name}
              <X size={13} />
            </button>
          ))}
        </div>
        <button onClick={clear} className="touch-target px-3 text-xs text-muted-foreground">
          Clear
        </button>
        <button
          ref={trigger}
          disabled={builds.length < 2}
          onClick={() => dialog.current?.showModal()}
          className="comparison-open"
        >
          Compare builds
        </button>
      </aside>
      <dialog
        ref={dialog}
        aria-labelledby="comparison-title"
        className="comparison-dialog"
        onClose={() => trigger.current?.focus()}
      >
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 id="comparison-title" className="font-display text-xl font-bold">
              Choose with a clear view.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Published build details, side by side. A dash means the feature is not listed.
            </p>
            <p className="mt-2 text-xs text-muted-foreground sm:hidden">
              Swipe the table sideways to see the other builds →
            </p>
          </div>
          <button
            onClick={() => dialog.current?.close()}
            aria-label="Close comparison"
            className="touch-target grid shrink-0 place-items-center rounded-full border border-border"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-5 pb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={differences}
              onChange={(e) => setDifferences(e.target.checked)}
            />
            Differences only
          </label>
          <button
            className="touch-target rounded-lg border border-border px-3 text-sm"
            onClick={async () => {
              const url = new URL("/mods", window.location.origin);
              url.searchParams.set("compare", builds.map((b) => b.slug).join(","));
              setShare(url.href);
              try {
                await navigator.clipboard.writeText(url.href);
                setShareMessage("Comparison link copied");
              } catch {
                setShareMessage("Copy the comparison link below");
              }
            }}
          >
            Copy comparison link
          </button>
        </div>
        {share && (
          <div className="px-5 pb-4">
            <p role="status" className="text-xs text-muted-foreground">
              {shareMessage}
            </p>
            <input
              aria-label="Comparison share link"
              readOnly
              value={share}
              onFocus={(e) => e.target.select()}
              className="control-input mt-2 w-full rounded-lg border p-2 text-xs"
            />
          </div>
        )}
        <div
          className="comparison-scroll"
          tabIndex={0}
          role="region"
          aria-label="Build comparison table, scroll horizontally on small screens"
        >
          <table className="comparison-table">
            <caption className="sr-only">
              Compare versions, sizes, elements, community signals and listed features
            </caption>
            <thead>
              <tr>
                <th scope="col">Build details</th>
                {builds.map((build) => (
                  <th scope="col" key={build.slug}>
                    <img src={build.image} alt="" width={64} height={64} />
                    <Link
                      to="/mods/$slug"
                      params={{ slug: build.slug }}
                      onClick={() => dialog.current?.close()}
                    >
                      {build.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Version", ...builds.map((b) => `v${b.version}`)],
                ["Element", ...builds.map((b) => elementTheme[b.element].label)],
                ["File size", ...builds.map((b) => b.size || "Not listed")],
                ["Updated", ...builds.map((b) => b.updated || "Not listed")],
                ["Downloads", ...builds.map((b) => formatCount(b.downloads))],
                ["Rating", ...builds.map((b) => b.baseRating.toFixed(1))],
              ]
                .filter(([, ...values]) => !differences || new Set(values).size > 1)
                .map(([label, ...values]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {values.map((value, i) => (
                      <td key={builds[i].slug}>{value}</td>
                    ))}
                  </tr>
                ))}
              {features
                .filter(
                  (feature) =>
                    !differences ||
                    new Set(builds.map((b) => b.features.includes(feature))).size > 1,
                )
                .map((feature) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    {builds.map((build) => (
                      <td key={build.slug}>{build.features.includes(feature) ? "Listed" : "—"}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="p-5 text-xs text-muted-foreground">
          Open a build for its complete notes and the usual download steps.
        </p>
      </dialog>
    </>
  );
}
