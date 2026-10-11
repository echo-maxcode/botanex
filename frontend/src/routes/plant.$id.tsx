import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  CalendarDays,
  Droplets,
  Leaf,
  MapPin,
  Sparkles,
  Sprout,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { PlantAvatar } from "@/components/plant-avatar";
import { SensorReadout } from "@/components/sensor-readout";
import { SpeciesCareReadout } from "@/components/species-care-readout";
import {
  formatDate,
  needsWater,
  nextWateringDate,
  syncWithBackend,
  usePlantStore,
  type WateringEntry,
} from "@/lib/plants";

export const Route = createFileRoute("/plant/$id")({
  head: () => {
    const title = "Plant Profile — BOTANEX";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Scan a plant's QR code to see its care schedule, watering history, and water savings on BOTANEX.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content:
            "Scan a plant's QR code to see its care schedule, watering history, and water savings on BOTANEX.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PlantProfilePage,
});

function PlantProfilePage() {
  const { id } = Route.useParams();
  const plants = usePlantStore((s) => s.plants);
  const log = usePlantStore((s) => s.log);

  useEffect(() => {
    syncWithBackend();
  }, []);

  // Fall back to the first sample plant so the QR-scan demo always has content.
  const plant = plants.find((p) => p.id === id) ?? plants[0];
  if (!plant) {
    throw notFound();
  }

  const thirsty = needsWater(plant);
  const nextDate = nextWateringDate(plant);

  const history = useMemo(
    () =>
      [...log]
        .filter((e) => e.plantId === plant.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6),
    [log, plant.id],
  );

  // Water saved this month vs. a fixed every-2-day baseline (0.45 L / watering).
  const savedLiters = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const actual = log
      .filter((e) => e.plantId === plant.id && new Date(e.date) >= cutoff)
      .reduce((sum, e) => sum + e.liters, 0);
    const baseline = 15 * 0.45; // 15 waterings / month @ 0.45 L
    return Math.max(0, Math.round((baseline - actual) * 10) / 10);
  }, [log, plant.id]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {/* Wordmark */}
      <header className="flex items-center justify-center gap-2 pt-7 pb-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-4 w-4" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          BOTANEX
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-3">
        {/* Hero illustration + name */}
        <section
          className="animate-fade-in relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sage via-card to-cream/60 p-6 text-center shadow-soft"
          style={{ animationFillMode: "backwards" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, var(--color-primary) 0, transparent 55%)",
            }}
          />
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-card shadow-lift">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-leaf text-primary-foreground">
              <PlantAvatarIcon species={plant.species} />
            </span>
          </div>
          <h1 className="relative mt-5 font-display text-3xl font-bold tracking-tight text-foreground">
            {plant.name}
          </h1>
          <p className="relative mt-1 text-sm italic text-muted-foreground">
            {plant.species}
          </p>
          <span
            className={`relative mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              thirsty
                ? "bg-amber-warm/15 text-amber-warm-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                thirsty ? "bg-amber-warm" : "bg-primary"
              }`}
            />
            {thirsty ? "Needs Water" : "Recently Watered"}
          </span>
        </section>

        {/* Care schedule */}
        <section
          className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-soft"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <h2 className="font-display text-base font-semibold text-foreground">
            Care schedule
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 text-sm">
            <Row icon={Droplets} label="Watering frequency">
              Every {plant.frequencyDays} days
            </Row>
            <Row icon={CalendarDays} label="Next watering">
              {nextDate ? formatDate(nextDate) : "No watering scheduled yet"}
            </Row>
            <Row icon={MapPin} label="Location">
              {plant.location}
            </Row>
            <Row icon={Sparkles} label="Status">
              {thirsty ? "Thirsty — due now" : "Happy & hydrated"}
            </Row>
          </div>
          <div className="mt-3">
            <SensorReadout plantId={plant.id} />
          </div>
          <SpeciesCareReadout
            plantId={plant.id}
            species={plant.species}
            openplantbookPid={plant.openplantbookPid}
            compact={false}
          />
        </section>

        {/* Centerpiece: water saved this month */}
        <section
          className="animate-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-leaf p-6 text-center text-primary-foreground shadow-lift"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 10%, #ffffff 0, transparent 40%)",
            }}
          />
          <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
            <Droplets className="h-6 w-6" />
          </span>
          <p className="relative mt-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
            Water saved this month
          </p>
          <p className="relative mt-1 font-display text-5xl font-bold leading-none">
            {savedLiters}
            <span className="ml-1 align-baseline text-2xl font-semibold">
              L
            </span>
          </p>
          <p className="relative mt-2 text-sm text-primary-foreground/90">
            vs. a fixed every-2-day baseline. Every drop you skip adds up.{" "}
            <Sprout className="-mt-0.5 inline h-4 w-4 align-middle" />
          </p>
        </section>

        {/* Watering history timeline */}
        <section
          className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-soft"
          style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <h2 className="font-display text-base font-semibold text-foreground">
            Watering history
          </h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No waterings recorded yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-0">
              {history.map((e, i) => (
                <TimelineItem key={e.id} entry={e} last={i === history.length - 1} />
              ))}
            </ol>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-1.5 border-t border-border bg-card px-5 py-4 text-xs text-muted-foreground">
        <Leaf className="h-3.5 w-3.5 text-primary" />
        Part of the{" "}
        <Link to="/" className="font-semibold text-foreground hover:text-primary">
          BOTANEX
        </Link>{" "}
        project
      </footer>
    </div>
  );
}

function PlantAvatarIcon({ species }: { species: string }) {
  const s = species.toLowerCase();
  const Icon =
    s.includes("cactus") || s.includes("succulent")
      ? Sprout
      : s.includes("fern") || s.includes("palm")
        ? Sparkles
        : s.includes("basil") || s.includes("herb")
          ? Sprout
          : Leaf;
  return <Icon className="h-9 w-9" />;
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3.5 py-2.5">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-leaf" />
        {label}
      </span>
      <span className="text-right font-semibold text-foreground">{children}</span>
    </div>
  );
}

function TimelineItem({
  entry,
  last,
}: {
  entry: WateringEntry;
  last: boolean;
}) {
  const due = new Date(entry.date);
  due.setDate(due.getDate() + 7); // illustrative next-due
  return (
    <li className="relative flex gap-3.5 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute left-[7px] top-4 bottom-0 w-px bg-border"
        />
      )}
      <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-card" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatDate(new Date(entry.date))}
          </span>
          <span className="text-xs text-muted-foreground">
            {entry.liters} L
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Watered by {entry.loggedBy}
        </p>
      </div>
    </li>
  );
}
