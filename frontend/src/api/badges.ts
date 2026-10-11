import { request } from "./client";
import type { BackendBadge } from "./types";

export interface CreateBadgeDto {
  name: string;
  criteria?: string;
  pointsAwarded: number;
  user?: { id: number | string } | null;
}

export const badgesApi = {
  getAll: () => request<BackendBadge[]>("/badges"),
  getById: (id: number | string) => request<BackendBadge>(`/badges/${id}`),
  getByUserId: (userId: number | string) =>
    request<BackendBadge[]>(`/badges/user/${userId}`),
  create: (data: CreateBadgeDto) =>
    request<BackendBadge>("/badges", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number | string, data: Partial<CreateBadgeDto>) =>
    request<BackendBadge>(`/badges/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number | string) =>
    request<void>(`/badges/${id}`, {
      method: "DELETE",
    }),
};
