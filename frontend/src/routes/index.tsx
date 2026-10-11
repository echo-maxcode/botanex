import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CloudRain,
  Cpu,
  Droplets,
  Flame,
  Radio,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PlantCard } from "@/components/plant-card";
import { PlantFormDialog } from "@/components/plant-form-dialog";
import {
  LiveSensorDot,
  MoistureRing,
  useLiveSensor,
} from "@/components/sensor-readout";
import { moistureLabel } from "@/lib/sensors";
import {
  currentStreak,
  needsWater,
  syncWithBackend,
  usePlantStore,
} from "@/lib/plants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Plant Care & Water-Saving Log" },
      {
        name: "description",
        content:
          "Your plant care dashboard: see which plants need water, track eco-points, and keep your watering streak alive.",
      },
      { property: "og:title", content: "Dashboard — Plant Care & Water-Saving Log" },
      {
        property: "og:description",
        content:
          "Your plant care dashboard: see which plants need water, track eco-points, and keep your watering streak alive.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tint: "green" | "cream";
}) {
  return (
    <div
      className={`flex items-center gap-3.5 sm:gap-4 rounded-2xl border border-border p-4 sm:p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        tint === "cream" ? "bg-cream" : "bg-card"
      }`}
    >
      <span
        className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${
          tint === "cream"
            ? "bg-amber-warm/20 text-amber-warm-foreground"
            : "bg-sage text-leaf"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl sm:text-2xl font-bold leading-none text-foreground truncate">
          {value}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function Esp32TelemetryHub({ plantName = "Monstera Deliciosa" }: { plantName?: string }) {
  const { reading } = useLiveSensor("1", 2500);

  if (!reading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-leaf">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                Live Sensor Telemetry
              </h3>
              <p className="text-xs text-muted-foreground">
                Connecting to live plant sensors…
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Radio className="h-3 w-3 animate-spin" /> Initializing
          </span>
        </div>
      </div>
    );
  }

  const { label, tone } = moistureLabel(reading.soilMoisture);
  const formattedTime = new Date(reading.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-leaf/30 bg-gradient-to-br from-card via-card to-sage/20 p-5 shadow-soft transition hover:shadow-lift sm:p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-leaf text-primary-foreground shadow-sm">
            <Cpu className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                Live Sensor Telemetry
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Live readings for <strong className="text-foreground">{plantName}</strong> · Updated{" "}
              <span className="font-mono font-medium text-foreground">{formattedTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LiveSensorDot label="Live Feed" />
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80"
          >
            History <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Real-time Metric Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Soil Moisture */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 p-3.5 shadow-sm">
          <MoistureRing value={reading.soilMoisture} size={50} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Soil Moisture</p>
            <p className="font-display text-lg font-bold text-foreground">
              {reading.soilMoisture.toFixed(1)}%
            </p>
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                tone === "dry"
                  ? "bg-amber-warm/20 text-amber-warm-foreground"
                  : tone === "wet"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-leaf/15 text-leaf"
              }`}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 p-3.5 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Thermometer className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Ambient Temp</p>
            <p className="font-display text-lg font-bold text-foreground">
              {reading.temperature.toFixed(1)}°C
            </p>
            <span className="text-[11px] text-muted-foreground">
              {(reading.temperature * 1.8 + 32).toFixed(1)}°F
            </span>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 p-3.5 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Waves className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Air Humidity</p>
            <p className="font-display text-lg font-bold text-foreground">
              {Math.round(reading.humidity)}%
            </p>
            <span className="text-[11px] text-muted-foreground">Relative Humidity</span>
          </div>
        </div>

        {/* Rain Sensor */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 p-3.5 shadow-sm">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              reading.rainDetected
                ? "bg-blue-600 text-white animate-pulse"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            {reading.rainDetected ? <CloudRain className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Rain Sensor</p>
            <p
              className={`font-display text-base font-bold ${
                reading.rainDetected ? "text-blue-600 dark:text-blue-400" : "text-foreground"
              }`}
            >
              {reading.rainDetected ? "Rain Detected" : "Dry / Clear"}
            </p>
            <span className="text-[11px] text-muted-foreground">
              {reading.rainDetected ? "Watering skipped" : "Normal sensor state"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const plants = usePlantStore((s) => s.plants);
  const ecoPoints = usePlantStore((s) => s.ecoPoints);
  const log = usePlantStore((s) => s.log);
  const thirsty = plants.filter(needsWater).length;
  const streak = currentStreak(log);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  // Auto-sync with backend on mount and periodically
  useEffect(() => {
    syncWithBackend();
    const id = setInterval(syncWithBackend, 12000);
    return () => clearInterval(id);
  }, []);

  const plant1 = plants.find((p) => p.id === "1") ?? plants[0];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${greeting()}, gardener 🌱`}
        subtitle="Here's how your indoor jungle is doing today."
      />

      <section className="grid grid-cols-2 gap-3.5 px-5 sm:grid-cols-4 sm:gap-4 sm:px-8">
        <StatCard icon={Sprout} label="Total Plants" value={plants.length} tint="green" />
        <StatCard icon={Droplets} label="Need Water Today" value={thirsty} tint="cream" />
        <StatCard icon={Sparkles} label="Eco-Points" value={ecoPoints} tint="green" />
        <StatCard icon={Flame} label="Watering Streak" value={`${streak} days`} tint="cream" />
      </section>

      {/* Live Sensor Telemetry Hub */}
      <section className="px-5 sm:px-8">
        <Esp32TelemetryHub plantName={plant1?.name ?? "Monstera Deliciosa"} />
      </section>

      {/* Weather Rain Advisory Banner (shown once above plant grid) */}
      {(() => {
        const rainNotice =
          plants.find((p) => p.status === "SKIP_SUGGESTED" && p.statusReason)?.statusReason ||
          (plants.some((p) => p.status === "SKIP_SUGGESTED")
            ? "Rain is forecast in the next 48 hours. Scheduled waterings are automatically suggested to be skipped to conserve water."
            : null);

        if (!rainNotice) return null;

        return (
          <section className="px-5 sm:px-8">
            <div className="flex items-center gap-3.5 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4 shadow-soft">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400">
                <CloudRain className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold text-sky-950 dark:text-sky-100">
                    Weather Advisory: Rain Forecast
                  </span>
                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Skipping Scheduled Watering
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-sky-800 dark:text-sky-200">
                  {rainNotice}
                </p>
              </div>
            </div>
          </section>
        );
      })()}

      <section className="px-5 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Your Plants
          </h2>
          <span className="text-xs font-medium text-muted-foreground">
            {thirsty} of {plants.length} need attention
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plants.map((p) => (
            <PlantCard
              key={p.id}
              plant={p}
              onOpenEdit={() => {
                setEditingPlant(p);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      <PlantFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        plant={editingPlant}
      />
    </div>
  );
}
