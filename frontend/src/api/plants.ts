import { request } from "./client";
import type { BackendPlant } from "./types";

export interface CreatePlantDto {
  name: string;
  species: string;
  location: string;
  wateringFrequency: number;
  lastWateredDate?: string;
  nextWateringDate?: string;
  status?: "NEEDS_WATER" | "RECENTLY_WATERED" | "SKIP_WATERING";
  qrCode?: string;
  openplantbookPid?: string | null;
}

export const plantsApi = {
  getAll: () => request<BackendPlant[]>("/plants"),
  getById: (id: number | string) => request<BackendPlant>(`/plants/${id}`),
  create: (data: CreatePlantDto) =>
    request<BackendPlant>("/plants", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number | string, data: Partial<CreatePlantDto>) =>
    request<BackendPlant>(`/plants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number | string) =>
    request<void>(`/plants/${id}`, {
      method: "DELETE",
    }),
  water: (id: number | string) =>
    request<BackendPlant>(`/plants/${id}/water`, {
      method: "POST",
    }),
};
