import { createFileRoute } from "@tanstack/react-router";
import {
  CloudRain,
  Droplets,
  Flame,
  Radio,
  RefreshCw,
  Sprout,
  Thermometer,
  TrendingUp,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { Line, LineChart } from "recharts";
import { PageHeader } from "@/components/app-shell";
import { LiveSensorDot } from "@/components/sensor-readout";
import { moistureLabel } from "@/lib/sensors";
import { sensorReadingsApi } from "@/api/sensorReadings";
import type { BackendSensorReading } from "@/api/types";
import {
  longestStreak,
  syncWithBackend,
  usePlantStore,
  waterSavedThisMonth,
  wateringsPerDay,
  weeklyWaterUse,
} from "@/lib/plants";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Plant Care & Water-Saving Log" },
      {
        name: "description",
        content:
          "Watering trends over 30 days and water saved versus a fixed baseline schedule.",
      },
      { property: "og:title", content: "Analytics — Plant Care & Water-Saving Log" },
      {
        property: "og:description",
        content:
          "Watering trends over 30 days and water saved versus a fixed baseline schedule.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const log = usePlantStore((s) => s.log);
  const plants = usePlantStore((s) => s.plants);

  useEffect(() => {
    syncWithBackend();
    const id = setInterval(syncWithBackend, 15000);
    return () => clearInterval(id);
  }, []);

  const daily = useMemo(() => wateringsPerDay(log, 30), [log]);
  const weekly = useMemo(
    () => weeklyWaterUse(log, plants.length),
    [log, plants.length],
  );
  const streak = useMemo(() => longestStreak(log), [log]);
  const saved = useMemo(
    () => waterSavedThisMonth(log, plants.length),
    [log, plants.length],
  );

  return (
    <div className="pb-4">
      <PageHeader
        title="Analytics"
        subtitle="Water-saving insights at a glance."
      />

      <div className="grid grid-cols-1 gap-4 px-5 sm:grid-cols-3 sm:px-8">
        <StatCard
          icon={Flame}
          label="Longest streak"
          value={`${streak} day${streak === 1 ? "" : "s"}`}
          hint="Consecutive days with a watering"
          delay={0}
        />
        <StatCard
          icon={Sprout}
          label="Total waterings"
          value={`${log.length}`}
          hint="All entries in the log"
          delay={80}
        />
        <StatCard
          icon={Droplets}
          label="Water saved this month"
          value={`${saved.toFixed(1)} L`}
          hint="vs. a fixed every-2-days schedule"
          delay={160}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 px-5 sm:px-8 lg:grid-cols-2">
        <ChartCard
          title="Watering events"
          subtitle="Past 30 days"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="fillWaterings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={6}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.25 }}
                content={<SoftTooltip unit=" waterings" />}
              />
              <Area
                type="monotone"
                dataKey="waterings"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#fillWaterings)"
                dot={false}
                activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Water saved per week"
          subtitle="Actual use vs. fixed baseline schedule"
          icon={Droplets}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekly} margin={{ top: 10, right: 8, left: -22, bottom: 0 }} barGap={6}>
              <defs>
                <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--leaf)" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                content={<SoftTooltip unit=" L" />}
              />
              <Bar
                dataKey="baseline"
                name="Baseline"
                fill="var(--sage)"
                radius={[8, 8, 0, 0]}
                animationDuration={1100}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="actual"
                name="Actual used"
                radius={[8, 8, 0, 0]}
                animationDuration={1300}
                animationBegin={180}
                animationEasing="ease-out"
              >
                {weekly.map((w) => (
                  <Cell key={w.week} fill="url(#fillActual)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Legend color="var(--sage)" label="Baseline schedule" />
            <Legend color="var(--primary)" label="Your actual use" />
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 px-5 sm:px-8">
        <SoilMoistureCard plants={plants} />
      </div>
    </div>
  );
}

function SoilMoistureCard({ plants }: { plants: Array<{ id: string; name: string }> }) {
  const [plantId, setPlantId] = useState(
    () => plants.find((p) => p.id === "1")?.id ?? plants[0]?.id ?? "1",
  );
  const [readings, setReadings] = useState<BackendSensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"all" | "moisture" | "temp" | "humidity">("moisture");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const history = await sensorReadingsApi.getHistory(plantId);
        if (!cancelled) {
          setReadings(Array.isArray(history) ? history : []);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Sensor feed unavailable or plant has no telemetry history.");
          setLoading(false);
        }
      }
    };

    load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [plantId]);

  // Sort chronological (oldest to newest) for chart
  const sorted = useMemo(() => {
    return [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [readings]);

  const data = useMemo(() => {
    return sorted.map((r) => ({
      label: new Date(r.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      moisture: Number(r.soilMoisture.toFixed(1)),
      temperature: Number(r.temperature.toFixed(1)),
      humidity: Math.round(r.humidity),
      rain: r.rainDetected ? 100 : 0,
    }));
  }, [sorted]);

  const latest = sorted.at(-1);
  const selectedPlant = plants.find((p) => p.id === plantId) ?? plants[0];

  return (
    <div className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift">
      {/* Header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-leaf">
            <Radio className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">
                Sensor Telemetry History
              </h2>
              <span className="rounded bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold text-leaf">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {latest
                ? `Active feed · ${readings.length} readings recorded in database`
                : "Awaiting telemetry feed…"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <LiveSensorDot label="Live Sensor" />
          <select
            value={plantId}
            onChange={(e) => {
              setPlantId(e.target.value);
              setLoading(true);
            }}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === "1" ? "(Live Sensor)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Latest Stats Strip */}
      {latest && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/80 bg-sage/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Current Moisture</p>
            <p className="font-display text-xl font-bold text-foreground">
              {latest.soilMoisture.toFixed(1)}%
            </p>
            <p className="text-[10px] font-semibold text-leaf">
              {moistureLabel(latest.soilMoisture).label}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-amber-500/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Temperature</p>
              <Thermometer className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              {latest.temperature.toFixed(1)}°C
            </p>
            <p className="text-[10px] text-muted-foreground">
              {(latest.temperature * 1.8 + 32).toFixed(1)}°F
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-blue-500/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Humidity</p>
              <Waves className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              {Math.round(latest.humidity)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Relative Humidity</p>
          </div>

          <div
            className={`rounded-xl border p-3 ${
              latest.rainDetected
                ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "border-border/80 bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Rain Sensor</p>
              <CloudRain className="h-3.5 w-3.5" />
            </div>
            <p className="font-display text-base font-bold">
              {latest.rainDetected ? "🌧️ Detected" : "☀️ Clear"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {latest.rainDetected ? "Rain active" : "No rain detected"}
            </p>
          </div>
        </div>
      )}

      {/* Metric Selector Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-secondary p-1 text-xs">
          <button
            onClick={() => setActiveMetric("moisture")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeMetric === "moisture"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Soil Moisture (%)
          </button>
          <button
            onClick={() => setActiveMetric("temp")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeMetric === "temp"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Temperature (°C)
          </button>
          <button
            onClick={() => setActiveMetric("humidity")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeMetric === "humidity"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Humidity (% RH)
          </button>
          <button
            onClick={() => setActiveMetric("all")}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              activeMetric === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Metrics
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activeMetric === "moisture" && <Legend color="var(--primary)" label="Moisture %" />}
          {activeMetric === "temp" && <Legend color="#f59e0b" label="Temperature °C" />}
          {activeMetric === "humidity" && <Legend color="#3b82f6" label="Humidity % RH" />}
          {activeMetric === "all" && (
            <>
              <Legend color="var(--primary)" label="Moisture" />
              <Legend color="#f59e0b" label="Temp °C" />
              <Legend color="#3b82f6" label="Humidity %" />
            </>
          )}
        </div>
      </div>

      {loading && readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Loading telemetry readings from database…
          </p>
        </div>
      ) : error || readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 px-4 text-center">
          <p className="text-sm font-semibold text-foreground">
            No telemetry stream found for {selectedPlant?.name ?? "this plant"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            The live sensor is currently attached to <strong>Monstera Deliciosa</strong>.
          </p>
          {plantId !== "1" && (
            <button
              onClick={() => setPlantId("1")}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110"
            >
              Switch to Monstera Deliciosa
            </button>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={Math.max(1, Math.floor(data.length / 8))}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.25 }}
              content={<SoftTooltip unit="" />}
            />
            {(activeMetric === "moisture" || activeMetric === "all") && (
              <Line
                type="monotone"
                dataKey="moisture"
                name="Moisture (%)"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={data.length <= 15}
                activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={600}
              />
            )}
            {(activeMetric === "temp" || activeMetric === "all") && (
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={data.length <= 15}
                activeDot={{ r: 5, fill: "#f59e0b", stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={600}
              />
            )}
            {(activeMetric === "humidity" || activeMetric === "all") && (
              <Line
                type="monotone"
                dataKey="humidity"
                name="Humidity (% RH)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={data.length <= 15}
                activeDot={{ r: 5, fill: "#3b82f6", stroke: "var(--card)", strokeWidth: 2 }}
                animationDuration={600}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function SoftTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lift">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 text-xs text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-leaf">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">
        {value}
      </p>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage text-leaf">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
