import { createFileRoute } from "@tanstack/react-router";
import {
  CloudRain,
  Flame,
  Leaf,
  Lock,
  Medal,
  Sprout,
  Trophy,
  Droplets,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  BADGES,
  CURRENT_USER_ID,
  LEADERBOARD_USERS,
  nextBadge,
  usePlantStore,
} from "@/lib/plants";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — BOTANEX" },
      {
        name: "description",
        content:
          "Earn eco-points, collect water-saving badges, and see how you rank against the community.",
      },
      { property: "og:title", content: "Leaderboard — BOTANEX" },
      {
        property: "og:description",
        content:
          "Earn eco-points, collect water-saving badges, and see how you rank against the community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const BADGE_ICONS: Record<string, LucideIcon> = {
  "first-plant": Sprout,
  "seven-streak": Flame,
  "rain-saver": CloudRain,
  "thirty-streak": Trophy,
  "water-wise": Droplets,
  "green-thumb": Leaf,
};

function LeaderboardPage() {
  // The live store holds the current user's eco-points; the mock leaderboard
  // snapshot is merged with that value so logging waterings nudges their rank.
  const livePoints = usePlantStore((s) => s.ecoPoints);

  const users = useMemo(() => {
    const merged = LEADERBOARD_USERS.map((u) =>
      u.isCurrentUser ? { ...u, ecoPoints: livePoints } : u,
    );
    return merged.sort((a, b) => b.ecoPoints - a.ecoPoints);
  }, [livePoints]);

  const currentUser = users.find((u) => u.id === CURRENT_USER_ID)!;
  const myRank = users.findIndex((u) => u.id === CURRENT_USER_ID) + 1;
  const upcoming = nextBadge(currentUser.ecoPoints);

  // Progress toward the next badge.
  const prevThreshold =
    BADGES.filter((b) => currentUser.ecoPoints >= b.threshold)
      .map((b) => b.threshold)
      .sort((a, b) => b - a)[0] ?? 0;
  const progress =
    upcoming == null
      ? 100
      : Math.round(
          ((currentUser.ecoPoints - prevThreshold) /
            (upcoming.threshold - prevThreshold)) *
            100,
        );

  return (
    <div className="pb-6">
      <PageHeader
        title="Eco-Points & Leaderboard"
        subtitle="Every watering you log earns eco-points and badges. Climb the community board."
      />

      {/* Header: current user summary + progress to next badge */}
      <section className="px-5 sm:px-8">
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sage/70 via-card to-cream/40 p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Trophy className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your eco-points
              </p>
              <p className="font-display text-4xl font-bold leading-none text-foreground">
                {currentUser.ecoPoints}
              </p>
            </div>
            <div className="ml-auto rounded-xl bg-card/80 px-4 py-2 text-center shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rank
              </p>
              <p className="font-display text-2xl font-bold text-primary">
                #{myRank}
              </p>
            </div>
          </div>

          {upcoming ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  Next: {upcoming.name}
                </span>
                <span className="text-muted-foreground">
                  {currentUser.ecoPoints} / {upcoming.threshold} pts
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {upcoming.threshold - currentUser.ecoPoints} points to unlock ·{" "}
                {upcoming.description}
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  All badges unlocked!
                </span>
                <span className="text-muted-foreground">Legend</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-leaf" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Badge grid */}
      <section className="mt-6 px-5 sm:px-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Badges
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map((badge, i) => {
            const earned = currentUser.ecoPoints >= badge.threshold;
            const Icon = BADGE_ICONS[badge.id] ?? Medal;
            return (
              <div
                key={badge.id}
                className={[
                  "animate-fade-in group relative flex flex-col items-center rounded-2xl border p-4 text-center transition",
                  earned
                    ? "border-primary/30 bg-card shadow-soft hover:-translate-y-1 hover:shadow-lift"
                    : "border-border bg-muted/40",
                ].join(" ")}
                style={{
                  animationDelay: `${i * 70}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {earned && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow:
                        "0 0 0 1px color-mix(in oklab, var(--primary) 18%, transparent), 0 6px 24px -8px color-mix(in oklab, var(--primary) 45%, transparent)",
                    }}
                  />
                )}
                <span
                  className={[
                    "relative flex h-12 w-12 items-center justify-center rounded-full transition group-hover:scale-105",
                    earned
                      ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  {earned ? (
                    <Icon className="h-6 w-6" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </span>
                <p
                  className={[
                    "relative mt-3 text-sm font-semibold",
                    earned ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {badge.name}
                </p>
                <p
                  className={[
                    "relative mt-0.5 text-xs leading-snug",
                    earned ? "text-muted-foreground" : "text-muted-foreground/70",
                  ].join(" ")}
                >
                  {earned ? badge.description : `${badge.threshold} pts`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leaderboard table */}
      <section className="mt-6 px-5 sm:px-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Community leaderboard
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-[64px_1fr_120px_120px] gap-3 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Rank</span>
            <span>Gardener</span>
            <span className="text-right">Eco-points</span>
            <span className="text-right">Badges</span>
          </div>
          <ul className="divide-y divide-border">
            {users.map((u, idx) => {
              const rank = idx + 1;
              const me = u.isCurrentUser;
              const podium =
                rank === 1
                  ? "bg-amber-warm text-amber-warm-foreground"
                  : rank === 2
                    ? "bg-sage text-leaf"
                    : rank === 3
                      ? "bg-cream text-cream-foreground"
                      : "";
              return (
                <li
                  key={u.id}
                  className={[
                    "grid grid-cols-1 gap-1.5 px-5 py-3.5 text-sm transition sm:grid-cols-[64px_1fr_120px_120px] sm:items-center sm:gap-3",
                    me
                      ? "border-l-4 border-primary bg-primary/5"
                      : "hover:bg-secondary/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    {podium ? (
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                          podium,
                        ].join(" ")}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {rank}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                        me
                          ? "bg-primary text-primary-foreground"
                          : "bg-sage text-leaf",
                      ].join(" ")}
                    >
                      {u.name.slice(0, 1)}
                    </span>
                    <span className="font-semibold text-foreground">
                      {u.name}
                      {me && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-right font-display text-base font-semibold text-foreground sm:text-foreground">
                    <span className="sm:hidden">Eco-points: </span>
                    {u.ecoPoints}
                  </span>
                  <span className="text-right text-muted-foreground">
                    <span className="sm:hidden">Badges: </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <Medal className="h-3.5 w-3.5 text-primary" />
                      {u.badgeCount}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
