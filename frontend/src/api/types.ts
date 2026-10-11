export interface BackendPlant {
  id: number;
  name: string;
  species: string;
  location: string;
  wateringFrequency: number;
  lastWateredDate: string | null;
  nextWateringDate: string | null;
  status: "NEEDS_WATER" | "RECENTLY_WATERED" | "SKIP_WATERING" | "SKIP_SUGGESTED";
  statusReason?: string;
  qrCode?: string;
  openplantbookPid?: string | null;
}

export interface PlantSearchResult {
  pid: string;
  displayPid: string;
  alias?: string | null;
}

export interface SpeciesCareProfile {
  id?: number;
  pid: string;
  displayPid: string;
  alias?: string | null;
  imageUrl?: string | null;
  minTemp?: number | null;
  maxTemp?: number | null;
  minSoilMoist?: number | null;
  maxSoilMoist?: number | null;
  minEnvHumid?: number | null;
  maxEnvHumid?: number | null;
  fertilizationTip?: string | null;
  careTips?: string | null;
  fetchedAt?: string | null;
}

export interface MetricRangeStatus {
  metric: "soilMoisture" | "temperature" | "humidity" | string;
  label: string;
  currentValue: number | null;
  unit: string;
  min: number | null;
  max: number | null;
  status: "LOW" | "OK" | "HIGH" | null;
  message: string;
}

export interface PlantRangeStatus {
  plantId: number;
  plantName: string;
  species: string;
  pid: string;
  hasReading: boolean;
  metrics: MetricRangeStatus[];
  summary: string;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  ecoPoints: number;
  roleTitle?: string;
}

export interface BackendWateringLog {
  id: number;
  plant: BackendPlant;
  user?: BackendUser | null;
  wateredDate: string;
  nextWateringDate?: string;
}

export interface BackendBadge {
  id: number;
  name: string;
  criteria?: string;
  pointsAwarded: number;
  user?: BackendUser | null;
}

export interface BackendNotification {
  id: number;
  user?: BackendUser | null;
  plant?: BackendPlant | null;
  message: string;
  type?: string;
  status?: string;
  createdAt: string;
}

export interface BackendSensorReading {
  id: number;
  plant: BackendPlant;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainDetected: boolean;
  timestamp: string;
}

export interface WeatherForecastDailyUnits {
  time?: string;
  precipitation_probability_max?: string;
}

export interface WeatherForecastDaily {
  time?: string[];
  precipitation_probability_max?: number[];
}

export interface BackendWeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  elevation?: number;
  daily_units?: WeatherForecastDailyUnits;
  daily?: WeatherForecastDaily;
}
