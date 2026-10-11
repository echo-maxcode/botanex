import { request } from "./client";
import type { BackendWateringLog } from "./types";

export interface CreateWateringLogDto {
  plant: { id: number | string };
  user?: { id: number | string } | null;
  wateredDate?: string;
  nextWateringDate?: string;
}

export const wateringLogsApi = {
  getAll: () => request<BackendWateringLog[]>("/watering-logs"),
  getById: (id: number | string) =>
    request<BackendWateringLog>(`/watering-logs/${id}`),
  getByPlantId: (plantId: number | string) =>
    request<BackendWateringLog[]>(`/watering-logs/plant/${plantId}`),
  getByUserId: (userId: number | string) =>
    request<BackendWateringLog[]>(`/watering-logs/user/${userId}`),
  create: (data: CreateWateringLogDto) =>
    request<BackendWateringLog>("/watering-logs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number | string) =>
    request<void>(`/watering-logs/${id}`, {
      method: "DELETE",
    }),
};
