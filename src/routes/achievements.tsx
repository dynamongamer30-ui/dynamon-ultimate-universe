import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { LevelBadge } from "@/components/LevelBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { useAuth } from "@/hooks/useAuth";
import { TrainerRankLadder } from "@/components/TrainerRankLadder";
import { AchievementCollection } from "@/components/AchievementCollection";

export const Route = createFileRoute("/achievements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Achievements — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { user } = useAuth();
  return (
    <PageShell>
      <header className="edge-light rounded-2xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Trophy className="h-3.5 w-3.5" /> Progression
        </p>
        <h1 className="mt-3 break-words font-display text-[clamp(1.5rem,7vw,2.25rem)] font-black uppercase tracking-tight sm:text-5xl">
          Trainer achievements
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Earn XP, level up, keep your streak, unlock badges.
        </p>
      </header>

      {!user ? (
        <p className="mt-10 text-center text-muted-foreground">Sign in to track your progress.</p>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <LevelBadge />
            <StreakBadge />
          </section>

          <TrainerRankLadder />

          <AchievementCollection />
        </>
      )}
    </PageShell>
  );
}
