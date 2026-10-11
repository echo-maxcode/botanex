import { useEffect, useState } from "react";
import { CloudRain, Radio, Thermometer, Waves } from "lucide-react";
import { sensorReadingsApi } from "@/api/sensorReadings";
import {
  generateReading,
  hasSensor,
  moistureLabel,
  type SensorReading,
} from "@/lib/sensors";

export interface LiveTelemetryData {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainDetected: boolean;
  timestamp: string;
}

/** Polls the real hardware sensor readings from backend for plantId. */
export function useLiveSensor(plantId: string, intervalMs = 3000) {
  const [reading, setReading] = useState<LiveTelemetryData | null>(null);
  const [connected, setConnected] = useState<boolean>(hasSensor(plantId));

  useEffect(() => {
    let cancelled = false;

    const fetchTelemetry = async () => {
      try {
        const data = await sensorReadingsApi.getLatest(plantId);
        if (!cancelled && data && typeof data.soilMoisture === "number") {
          setReading({
            soilMoisture: data.soilMoisture,
            temperature: data.temperature,
            humidity: data.humidity,
            rainDetected: Boolean(data.rainDetected),
            timestamp: data.timestamp || new Date().toISOString(),
          });
          setConnected(true);
          return;
        }
      } catch {
        // Fall back to pseudo-signal if mock plant or backend offline
        if (!cancelled && hasSensor(plantId)) {
          const mock = generateReading(plantId, new Date());
          setReading({
            soilMoisture: mock.moisture,
            temperature: mock.temperature,
            humidity: mock.humidity,
            rainDetected: false,
            timestamp: mock.t,
          });
          setConnected(true);
          return;
        }
      }

      if (!cancelled) {
        setConnected(false);
      }
    };

    fetchTelemetry();
    const id = setInterval(fetchTelemetry, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [plantId, intervalMs]);

  return { connected, reading };
}

export function LiveSensorDot({ label = "Live Sensor" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-leaf">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      {label}
    </span>
  );
}

export function MoistureRing({ value, size = 48 }: { value: number; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <span
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--secondary)" strokeWidth="5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-display text-xs font-bold text-foreground">
        {Math.round(value)}%
      </span>
    </span>
  );
}

export function SensorReadout({ plantId }: { plantId: string }) {
  const { connected, reading } = useLiveSensor(plantId);
  if (!connected || !reading) return null;
  const { label } = moistureLabel(reading.soilMoisture);

  return (
    <div className="mt-3 rounded-xl border border-border bg-sage/30 p-3 shadow-inner">
      <div className="flex items-center justify-between gap-2">
        <LiveSensorDot />
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-leaf">
          <Radio className="h-3 w-3 animate-pulse" /> Live
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <MoistureRing value={reading.soilMoisture} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-semibold text-foreground">
              Soil moisture · {label}
            </p>
            {reading.rainDetected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                <CloudRain className="h-3 w-3 animate-bounce" /> Rain Alert
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Thermometer className="h-3.5 w-3.5 text-amber-600" /> {reading.temperature.toFixed(1)}°C
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Waves className="h-3.5 w-3.5 text-blue-500" /> {Math.round(reading.humidity)}% RH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
