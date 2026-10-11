/* ------------------------------------------------------------------ */
/* Hardware sensor layer.                                              */
/* Readings are generated deterministically from (plantId, timestamp)  */
/* so the server and the client agree. Swap generateReading() for a    */
/* real device feed later — the rest of the API stays the same.        */
/* ------------------------------------------------------------------ */

export type SensorReading = {
  /** ISO timestamp */
  t: string;
  /** soil moisture, 0-100 % */
  moisture: number;
  /** °C */
  temperature: number;
  /** relative humidity, 0-100 % */
  humidity: number;
  /** Rain detected by hardware sensor */
  rainDetected?: boolean;
};

/** Plants with a physical sensor attached. Plant 1 is the ESP32 hardware default. */
export const SENSOR_PLANT_IDS = ["1", "p1", "p3"];

export function hasSensor(plantId: string | number): boolean {
  const strId = String(plantId);
  return SENSOR_PLANT_IDS.includes(strId) || strId === "1";
}

function seeded(plantId: string): number {
  let h = 0;
  for (let i = 0; i < plantId.length; i++) h = (h * 31 + plantId.charCodeAt(i)) % 997;
  return h;
}

/** Smooth, repeatable pseudo-signal for a given plant + moment in time. */
export function generateReading(plantId: string, at: Date): SensorReading {
  const s = seeded(plantId);
  const mins = at.getTime() / 60_000;
  const hourOfDay = at.getHours() + at.getMinutes() / 60;

  // Moisture drifts down over the day with small fluctuations, refilled by watering cycles.
  const cycle = Math.sin((mins / 720) * Math.PI * 2 + s);
  const jitter = Math.sin(mins / 7 + s) * 1.6 + Math.sin(mins / 2.3 + s * 2) * 0.8;
  const moisture = clamp(52 + cycle * 14 + jitter, 8, 96);

  // Temperature follows a daily curve; humidity moves inversely.
  const dayCurve = Math.sin(((hourOfDay - 9) / 24) * Math.PI * 2);
  const temperature = clamp(21.5 + dayCurve * 3.2 + Math.sin(mins / 11 + s) * 0.4, 12, 34);
  const humidity = clamp(56 - dayCurve * 9 + Math.sin(mins / 9 + s * 3) * 1.8, 20, 92);

  return {
    t: at.toISOString(),
    moisture: round(moisture, 1),
    temperature: round(temperature, 1),
    humidity: round(humidity, 0),
  };
}

/** Past `hours` of readings at `stepMinutes` resolution, oldest first. */
export function generateHistory(
  plantId: string,
  hours = 24,
  stepMinutes = 30,
  now = new Date(),
): SensorReading[] {
  const out: SensorReading[] = [];
  const steps = Math.round((hours * 60) / stepMinutes);
  for (let i = steps; i >= 0; i--) {
    out.push(generateReading(plantId, new Date(now.getTime() - i * stepMinutes * 60_000)));
  }
  return out;
}

export function moistureLabel(moisture: number): {
  label: string;
  tone: "dry" | "ok" | "wet";
} {
  if (moisture < 30) return { label: "Dry", tone: "dry" };
  if (moisture > 75) return { label: "Wet", tone: "wet" };
  return { label: "Ideal", tone: "ok" };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
