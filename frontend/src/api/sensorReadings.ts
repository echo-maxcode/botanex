import { request } from "./client";
import type { BackendSensorReading } from "./types";

export interface CreateSensorReadingDto {
  plant: { id: number | string };
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainDetected: boolean;
  timestamp?: string;
}

export const sensorReadingsApi = {
  getAll: () => request<BackendSensorReading[]>("/sensor-readings"),
  getById: (id: number | string) =>
    request<BackendSensorReading>(`/sensor-readings/${id}`),
  getLatest: (plantId: number | string) =>
    request<BackendSensorReading>(`/sensor-readings/latest/${plantId}`),
  getHistory: (plantId: number | string) =>
    request<BackendSensorReading[]>(`/sensor-readings/history/${plantId}`),
  create: (data: CreateSensorReadingDto) =>
    request<BackendSensorReading>("/sensor-readings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number | string) =>
    request<void>(`/sensor-readings/${id}`, {
      method: "DELETE",
    }),
};
