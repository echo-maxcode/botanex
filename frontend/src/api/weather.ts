import { request } from "./client";
import type { BackendWeatherForecast } from "./types";

export const weatherApi = {
  getForecast: () => request<BackendWeatherForecast>("/weather/forecast"),
};
