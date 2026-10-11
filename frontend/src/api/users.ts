import { request } from "./client";
import type { BackendUser } from "./types";

export interface CreateUserDto {
  name: string;
  email: string;
  ecoPoints?: number;
}

export const usersApi = {
  getAll: () => request<BackendUser[]>("/users"),
  getById: (id: number | string) => request<BackendUser>(`/users/${id}`),
  create: (data: CreateUserDto) =>
    request<BackendUser>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number | string, data: Partial<CreateUserDto>) =>
    request<BackendUser>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number | string) =>
    request<void>(`/users/${id}`, {
      method: "DELETE",
    }),
  addPoints: (id: number | string, points: number) =>
    request<BackendUser>(`/users/${id}/points`, {
      method: "POST",
      body: JSON.stringify({ points }),
    }),
};
