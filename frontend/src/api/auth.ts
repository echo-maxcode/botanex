import {
  request,
  getStoredToken,
  setStoredAuth,
  getStoredUser,
  ensureAuthToken,
} from "./client";

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  ecoPoints: number;
}

export interface UserProfileDto {
  id: number;
  name: string;
  email: string;
  ecoPoints: number;
  createdDate?: string;
  plantCount: number;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setStoredAuth(res);
    return res;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const res = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    setStoredAuth(res);
    return res;
  },

  getMe: async (): Promise<UserProfileDto> => {
    return request<UserProfileDto>("/users/me");
  },

  logout: () => {
    setStoredAuth(null);
  },

  getToken: getStoredToken,
  getCurrentUser: getStoredUser as () => AuthResponse | null,
  ensureAuthToken,
};
