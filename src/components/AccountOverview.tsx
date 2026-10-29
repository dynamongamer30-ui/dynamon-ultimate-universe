import { Link } from "@tanstack/react-router";
import { ContinueBrowsing } from "@/hooks/useBuildActivity";
export function AccountOverview() {
  return (
    <section className="mb-8" aria-label="Account shortcuts">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/rewards"
          hash="my-rewards"
          className="touch-target rounded-xl border border-border bg-card p-4"
        >
          <strong className="block">My Rewards</strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Recover eligible keys and claim passes.
          </span>
        </Link>
        <Link to="/favorites" className="touch-target rounded-xl border border-border bg-card p-4">
          <strong className="block">My favorites</strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Return to your saved builds.
          </span>
        </Link>
        <Link to="/mods" className="touch-target rounded-xl border border-border bg-card p-4">
          <strong className="block">Saved searches</strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Open and manage named filter presets.
          </span>
        </Link>
        <Link
          to="/notifications"
          className="touch-target rounded-xl border border-border bg-card p-4"
        >
          <strong className="block">Notifications</strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Read notices without losing rewards.
          </span>
        </Link>
      </div>
      <ContinueBrowsing />
    </section>
  );
}
