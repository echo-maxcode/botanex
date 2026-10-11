import { request } from "./client";
import type { BackendNotification } from "./types";

export interface CreateNotificationDto {
  user?: { id: number | string } | null;
  plant?: { id: number | string } | null;
  message: string;
  type?: string;
  status?: string;
}

export const notificationsApi = {
  getAll: () => request<BackendNotification[]>("/notifications"),
  getById: (id: number | string) =>
    request<BackendNotification>(`/notifications/${id}`),
  getByUserId: (userId: number | string) =>
    request<BackendNotification[]>(`/notifications/user/${userId}`),
  getByPlantId: (plantId: number | string) =>
    request<BackendNotification[]>(`/notifications/plant/${plantId}`),
  create: (data: CreateNotificationDto) =>
    request<BackendNotification>("/notifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number | string, data: Partial<CreateNotificationDto>) =>
    request<BackendNotification>(`/notifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  markAsRead: (id: number | string) =>
    request<BackendNotification>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
  delete: (id: number | string) =>
    request<void>(`/notifications/${id}`, {
      method: "DELETE",
    }),
};
