import { useSyncExternalStore } from "react";
import { plantsApi, type CreatePlantDto } from "@/api/plants";
import { plantbookApi } from "@/api/plantbook";
import { wateringLogsApi } from "@/api/wateringLogs";
import type { BackendPlant, BackendWateringLog } from "@/api/types";

export type Plant = {
  id: string;
  name: string;
  species: string;
  location: string;
  frequencyDays: number;
  lastWatered: string; // ISO date
  nextWateringDate?: string | null | undefined;
  status?: ("NEEDS_WATER" | "RECENTLY_WATERED" | "SKIP_WATERING" | "SKIP_SUGGESTED") | undefined;
  statusReason?: string | undefined;
  qrCode?: string | undefined;
  openplantbookPid?: string | null | undefined;
};

export type WateringEntry = {
  id: string;
  plantId: string;
  date: string;
  liters: number;
  loggedBy: string;
};

export const CAREGIVERS = ["Alice Green", "Botanical Admin", "Aisha", "Ben", "Chloe", "Dev"] as const;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function toFrontendPlant(bp: BackendPlant): Plant {
  let statusReason = bp.statusReason;
  if (statusReason && (statusReason.includes("on null") || statusReason.includes("is on null"))) {
    statusReason = statusReason
      .replace("next scheduled watering is on null.", "no watering scheduled yet.")
      .replace("next scheduled watering is on null", "no watering scheduled yet")
      .replace("on null", "not scheduled yet");
  }

  return {
    id: String(bp.id),
    name: bp.name,
    species: bp.species,
    location: bp.location,
    frequencyDays: bp.wateringFrequency,
    lastWatered: bp.lastWateredDate ? bp.lastWateredDate.slice(0, 10) : daysAgo(0),
    nextWateringDate: bp.nextWateringDate ? bp.nextWateringDate.slice(0, 10) : null,
    status: bp.status,
    statusReason: statusReason,
    qrCode: bp.qrCode,
    openplantbookPid: bp.openplantbookPid ?? null,
  };
}

export function toFrontendWateringEntry(bw: BackendWateringLog): WateringEntry {
  return {
    id: String(bw.id),
    plantId: String(bw.plant?.id ?? ""),
    date: bw.wateredDate ? bw.wateredDate.slice(0, 10) : daysAgo(0),
    liters: 0.35,
    loggedBy: bw.user?.name ?? "Alice Green",
  };
}

const initialPlants: Plant[] = [
  { id: "1", name: "Monstera Deliciosa", species: "Monstera deliciosa", location: "Living Room Window", frequencyDays: 7, lastWatered: daysAgo(2), status: "SKIP_SUGGESTED", statusReason: "Rain forecast: 100% chance of precipitation in the next 48h. Watering can be delayed to conserve water.", openplantbookPid: "monstera deliciosa" },
  { id: "2", name: "Snake Plant", species: "Sansevieria trifasciata", location: "Bedroom Desk", frequencyDays: 14, lastWatered: daysAgo(15), status: "NEEDS_WATER" },
  { id: "3", name: "Golden Pothos", species: "Epipremnum aureum", location: "Kitchen Shelf", frequencyDays: 5, lastWatered: daysAgo(1), status: "RECENTLY_WATERED" },
];

const initialLog: WateringEntry[] = [
  { id: "w01", plantId: "1", date: daysAgo(2), liters: 0.5, loggedBy: "Alice Green" },
  { id: "w02", plantId: "3", date: daysAgo(1), liters: 0.3, loggedBy: "Alice Green" },
  { id: "w03", plantId: "2", date: daysAgo(15), liters: 0.4, loggedBy: "Alice Green" },
];

/* Mock forecast signal fallback */
export const RAIN_FORECAST_LOCATIONS = ["Balcony", "Kitchen", "Living Room Window"];

export function hasRainForecast(plant: Plant): boolean {
  if (plant.status === "SKIP_SUGGESTED") return true;
  return RAIN_FORECAST_LOCATIONS.includes(plant.location);
}

/* ------------------------------ store ----------------------------- */

type State = {
  plants: Plant[];
  log: WateringEntry[];
  ecoPoints: number;
};

let state: State = { plants: initialPlants, log: initialLog, ecoPoints: 240 };
const listeners = new Set<() => void>();

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function usePlantStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}

let isSyncing = false;
export async function syncWithBackend() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const [backendPlants, backendLogs] = await Promise.all([
      plantsApi.getAll().catch(() => [] as BackendPlant[]),
      wateringLogsApi.getAll().catch(() => [] as BackendWateringLog[]),
    ]);

    const nextState: Partial<State> = {};
    if (backendPlants && backendPlants.length > 0) {
      nextState.plants = backendPlants.map(toFrontendPlant);
    }
    if (backendLogs && backendLogs.length > 0) {
      nextState.log = backendLogs.map(toFrontendWateringEntry);
    }
    if (Object.keys(nextState).length > 0) {
      setState(nextState);
    }
  } catch (err) {
    console.warn("Backend sync failed, using current state:", err);
  } finally {
    isSyncing = false;
  }
}

/* ---------------------------- selectors --------------------------- */

export function nextWateringDate(plant: Plant): Date | null {
  if (plant.nextWateringDate) {
    const d = new Date(plant.nextWateringDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (!plant.lastWatered && !plant.frequencyDays) return null;
  const d = new Date(plant.lastWatered);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (plant.frequencyDays || 7));
  return isNaN(d.getTime()) ? null : d;
}

export function needsWater(plant: Plant): boolean {
  if (plant.status === "NEEDS_WATER") return true;
  if (
    plant.status === "SKIP_SUGGESTED" ||
    plant.status === "SKIP_WATERING" ||
    plant.status === "RECENTLY_WATERED"
  ) {
    return false;
  }
  const next = nextWateringDate(plant);
  if (!next) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return next <= today;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "No watering scheduled yet";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "No watering scheduled yet";
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatNextWateringText(plant: Plant): string {
  const d = nextWateringDate(plant);
  if (!d || isNaN(d.getTime())) {
    return "No watering scheduled yet";
  }
  return `Next watering: ${formatDate(d)}`;
}

/* ---------------------------- mutations --------------------------- */

export async function addPlant(p: Omit<Plant, "id" | "lastWatered">) {
  const tempId = crypto.randomUUID();
  const candidatePid = p.openplantbookPid || (p.species ? p.species.trim().toLowerCase() : null);
  const plant: Plant = { ...p, id: tempId, lastWatered: daysAgo(0), status: "RECENTLY_WATERED", openplantbookPid: candidatePid };
  setState({ plants: [...state.plants, plant] });

  try {
    const created = await plantsApi.create({
      name: p.name,
      species: p.species,
      location: p.location,
      wateringFrequency: p.frequencyDays,
      openplantbookPid: candidatePid,
    });
    if (created && created.id) {
      if (candidatePid) {
        await plantbookApi.linkPlant(created.id, candidatePid).catch((err) => {
          console.warn("Could not link OpenPlantbook species:", err);
        });
      }
      setState({
        plants: state.plants.map((pl) => (pl.id === tempId ? toFrontendPlant(created) : pl)),
      });
      syncWithBackend();
    }
  } catch (e) {
    console.warn("Failed to save plant on backend:", e);
  }
}

export async function updatePlant(id: string, patch: Partial<Omit<Plant, "id">>) {
  const pidToLink =
    patch.openplantbookPid ||
    (patch.species ? patch.species.trim().toLowerCase() : undefined);

  setState({
    plants: state.plants.map((p) =>
      p.id === id ? { ...p, ...patch, ...(pidToLink ? { openplantbookPid: pidToLink } : {}) } : p
    ),
  });

  const numericId = Number(id);
  if (!isNaN(numericId)) {
    try {
      const payload: Partial<CreatePlantDto> = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.species !== undefined) payload.species = patch.species;
      if (patch.location !== undefined) payload.location = patch.location;
      if (patch.frequencyDays !== undefined) payload.wateringFrequency = patch.frequencyDays;
      if (pidToLink !== undefined) payload.openplantbookPid = pidToLink;

      const updated = await plantsApi.update(numericId, payload);

      if (pidToLink) {
        await plantbookApi.linkPlant(numericId, pidToLink).catch((err) => {
          console.warn("Could not link OpenPlantbook species:", err);
        });
      }

      if (updated && updated.id) {
        setState({
          plants: state.plants.map((p) => (p.id === id ? toFrontendPlant(updated) : p)),
        });
      }
      syncWithBackend();
    } catch (e) {
      console.warn("Failed to update plant on backend:", e);
    }
  }
}

export async function removePlant(id: string) {
  setState({
    plants: state.plants.filter((p) => p.id !== id),
    log: state.log.filter((e) => e.plantId !== id),
  });

  const numericId = Number(id);
  if (!isNaN(numericId)) {
    try {
      await plantsApi.delete(numericId);
    } catch (e) {
      console.warn("Failed to delete plant on backend:", e);
    }
  }
}

export async function logWatering(id: string, loggedBy = "Alice Green") {
  const plant = state.plants.find((p) => p.id === id);
  setState({
    plants: state.plants.map((p) =>
      p.id === id ? { ...p, lastWatered: daysAgo(0), status: "RECENTLY_WATERED" as const, statusReason: undefined } : p,
    ),
    log: [
      {
        id: crypto.randomUUID(),
        plantId: id,
        date: daysAgo(0),
        liters: plant ? Math.round((plant.frequencyDays / 20 + 0.15) * 100) / 100 : 0.25,
        loggedBy,
      },
      ...state.log,
    ],
    ecoPoints: state.ecoPoints + 10,
  });

  const numericId = Number(id);
  if (!isNaN(numericId)) {
    try {
      await plantsApi.water(numericId);
      await wateringLogsApi.create({
        plant: { id: numericId },
        wateredDate: new Date().toISOString(),
      });
      await syncWithBackend();
    } catch (e) {
      console.warn("Failed to log watering on backend:", e);
    }
  }
}

/* --------------------------- analytics ---------------------------- */

export function daysSince(iso: string): number {
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** True when the plant was watered inside its scheduled interval. */
export function wateredRecently(plant: Plant): boolean {
  return daysSince(plant.lastWatered) < plant.frequencyDays;
}

export type DayPoint = { date: string; label: string; waterings: number };

export function wateringsPerDay(log: WateringEntry[], days = 30): DayPoint[] {
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = daysAgo(i);
    points.push({
      date: iso,
      label: formatDate(new Date(iso)),
      waterings: log.filter((e) => e.date === iso).length,
    });
  }
  return points;
}

export type WeekPoint = {
  week: string;
  baseline: number;
  actual: number;
  saved: number;
};

/** Baseline = a fixed every-2-days schedule for every plant. */
export function weeklyWaterUse(
  log: WateringEntry[],
  plantCount: number,
  weeks = 4,
): WeekPoint[] {
  const out: WeekPoint[] = [];
  const baselineLiters = plantCount * 3.5 * 0.45; // 3.5 waterings/week @ 0.45 L
  for (let w = weeks - 1; w >= 0; w--) {
    const start = daysAgo(w * 7 + 6);
    const end = daysAgo(w * 7);
    const actual = log
      .filter((e) => e.date >= start && e.date <= end)
      .reduce((sum, e) => sum + e.liters, 0);
    out.push({
      week: w === 0 ? "This week" : `${w}w ago`,
      baseline: Math.round(baselineLiters * 10) / 10,
      actual: Math.round(actual * 10) / 10,
      saved: Math.round(Math.max(0, baselineLiters - actual) * 10) / 10,
    });
  }
  return out;
}

export function longestStreak(log: WateringEntry[]): number {
  const dates = [...new Set(log.map((e) => e.date))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of dates) {
    const t = new Date(d).getTime();
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Current watering streak: consecutive days ending today (or yesterday, so the
 * streak doesn't reset mid-day) that each have at least one watering entry.
 */
export function currentStreak(log: WateringEntry[]): number {
  const wateredDays = new Set(log.map((e) => e.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow the streak to count from yesterday if nothing's been logged yet today.
  const startOffset = wateredDays.has(today.toISOString().slice(0, 10)) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (wateredDays.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function waterSavedThisMonth(
  log: WateringEntry[],
  plantCount: number,
): number {
  return weeklyWaterUse(log, plantCount).reduce((s, w) => s + w.saved, 0);
}

/* --------------------------- leaderboard -------------------------- */

export type Badge = {
  id: string;
  name: string;
  description: string;
  /** points threshold at which the badge is earned */
  threshold: number;
};

export const BADGES: Badge[] = [
  { id: "first-plant", name: "First Plant", description: "Add your first plant", threshold: 0 },
  { id: "seven-streak", name: "7-Day Streak", description: "Water every day for a week", threshold: 70 },
  { id: "rain-saver", name: "Rain Saver", description: "Skip a watering on a rain forecast", threshold: 130 },
  { id: "thirty-streak", name: "30-Day Streak", description: "A full month of care", threshold: 210 },
  { id: "water-wise", name: "Water Wise", description: "Save 10L versus the baseline", threshold: 280 },
  { id: "green-thumb", name: "Green Thumb", description: "Care for 10 plants", threshold: 350 },
];

export type LeaderboardUser = {
  id: string;
  name: string;
  ecoPoints: number;
  badgeCount: number;
  isCurrentUser?: boolean;
};

export const CURRENT_USER_ID = "u-self";

export const LEADERBOARD_USERS: LeaderboardUser[] = [
  { id: "u1", name: "Mara Okonkwo", ecoPoints: 410, badgeCount: 6 },
  { id: "u2", name: "Leo Tanaka", ecoPoints: 372, badgeCount: 5 },
  { id: "u3", name: "Priya Nair", ecoPoints: 318, badgeCount: 4 },
  { id: CURRENT_USER_ID, name: "You", ecoPoints: 240, badgeCount: 3, isCurrentUser: true },
  { id: "u4", name: "Sam Whitfield", ecoPoints: 205, badgeCount: 3 },
  { id: "u5", name: "Noa Cohen", ecoPoints: 168, badgeCount: 3 },
  { id: "u6", name: "Diego Marín", ecoPoints: 142, badgeCount: 2 },
  { id: "u7", name: "Ingrid Solberg", ecoPoints: 96, badgeCount: 2 },
  { id: "u8", name: "Tariq Hossain", ecoPoints: 64, badgeCount: 1 },
];

/** Next badge the given points total has not yet reached. */
export function nextBadge(points: number): Badge | null {
  return BADGES.find((b) => points < b.threshold) ?? null;
}

