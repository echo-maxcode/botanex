import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CloudRain, Droplets, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PlantAvatar } from "@/components/plant-avatar";
import {
  CAREGIVERS,
  daysSince,
  formatDate,
  hasRainForecast,
  logWatering,
  nextWateringDate,
  usePlantStore,
  wateredRecently,
  type Plant,
} from "@/lib/plants";

export const Route = createFileRoute("/watering-log")({
  head: () => ({
    meta: [
      { title: "Watering Log — Plant Care & Water-Saving Log" },
      {
        name: "description",
        content:
          "Every watering event with dates, next due reminders, and who logged it.",
      },
      { property: "og:title", content: "Watering Log — Plant Care & Water-Saving Log" },
      {
        property: "og:description",
        content:
          "Every watering event with dates, next due reminders, and who logged it.",
      },
    ],
  }),
  component: WateringLogPage,
});

function WateringLogPage() {
  const plants = usePlantStore((s) => s.plants);
  const log = usePlantStore((s) => s.log);
  const [formOpen, setFormOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const plantById = useMemo(
    () => Object.fromEntries(plants.map((p) => [p.id, p])) as Record<string, Plant>,
    [plants],
  );

  const rows = useMemo(
    () =>
      [...log]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .flatMap((e) => {
          const plant = plantById[e.plantId];
          return plant ? [{ entry: e, plant }] : [];
        }),
    [log, plantById],
  );

  const rainPlants = plants.filter(
    (p) => hasRainForecast(p) && !dismissed.includes(p.id),
  );

  return (
    <div className="pb-4">
      <PageHeader
        title="Watering Log"
        subtitle="Every drop, recorded — with who watered what and when it's due again."
        action={
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Log New Watering
          </button>
        }
      />

      <div className="space-y-3 px-5 sm:px-8">
        {rainPlants.map((p) => (
          <div
            key={p.id}
            className="animate-fade-in flex items-start gap-3 rounded-2xl border border-border bg-cream px-4 py-3 shadow-soft"
          >
            <CloudRain className="mt-0.5 h-5 w-5 shrink-0 text-cream-foreground" />
            <p className="min-w-0 flex-1 text-sm text-cream-foreground">
              <span className="font-semibold">{p.name}</span> ({p.location}) — Rain
              forecast this week, consider skipping watering.
            </p>
            <button
              aria-label={`Dismiss rain notice for ${p.name}`}
              onClick={() => setDismissed((d) => [...d, p.id])}
              className="shrink-0 rounded-lg p-1 text-cream-foreground/70 transition hover:bg-background/60 hover:text-cream-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 px-5 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Plant</span>
            <span>Date watered</span>
            <span>Next due</span>
            <span>Logged by</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map(({ entry, plant }) => {
              const due = nextWateringDate({
                ...plant,
                lastWatered: entry.date,
              });
              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-1 gap-1.5 px-5 py-3.5 text-sm transition hover:bg-secondary/40 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <PlantAvatar species={plant.species} className="h-8 w-8 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {plant.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {plant.species} · {entry.liters} L
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden">Watered: </span>
                    {formatDate(new Date(entry.date))}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="sm:hidden">Next due: </span>
                    {formatDate(due)}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="sm:hidden">By: </span>
                    {entry.loggedBy}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {formOpen && (
        <LogWateringDialog plants={plants} onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}

function LogWateringDialog({
  plants,
  onClose,
}: {
  plants: Plant[];
  onClose: () => void;
}) {
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [who, setWho] = useState<string>(CAREGIVERS[0]);
  const plant = plants.find((p) => p.id === plantId);
  const tooSoon = plant ? wateredRecently(plant) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Log new watering"
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-leaf">
            <Droplets className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Log new watering
            </h2>
            <p className="text-xs text-muted-foreground">
              Record a drink for one of your plants.
            </p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-semibold text-foreground">
          Plant
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.species}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-foreground">
          Logged by
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {CAREGIVERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {plant && tooSoon && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-warm/15 px-3.5 py-3 text-sm text-amber-warm-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {plant.name} was watered {daysSince(plant.lastWatered)} day
              {daysSince(plant.lastWatered) === 1 ? "" : "s"} ago and is on a{" "}
              {plant.frequencyDays}-day schedule. Watering now risks overwatering
              — next due {formatDate(nextWateringDate(plant))}.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            disabled={!plant || tooSoon}
            onClick={() => {
              if (!plant) return;
              logWatering(plant.id, who);
              toast.success(`${plant.name} watered — logged by ${who}.`);
              onClose();
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tooSoon ? "Not due yet" : "Log watering"}
          </button>
        </div>
      </div>
    </div>
  );
}
