import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { logError } from "@/features/errors/lib/error-log";
import { classifyApiError } from "@/features/errors/lib/classify";
import { RefreshTokenResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 
    "Content-Type": "application/json",
    "x-client-type": "web"
  },
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const classified = classifyApiError(error);
    logError({
      type: classified.type,
      statusCode: classified.statusCode,
      title: classified.title,
      message: classified.message,
      technical: classified.technical,
      retriable: classified.retriable,
      systemic: classified.systemic,
      url: error.config?.url ?? "",
    });

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest.url ?? "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/verify-2fa") ||
      url.includes("/auth/refresh-token");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            if (typeof originalRequest.headers.set === "function") {
              originalRequest.headers.set("Authorization", `Bearer ${token}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const { data: refreshResp } = await axios.post<{ success: boolean; data: RefreshTokenResponse }>(
          `${API_URL}/auth/refresh-token`,
          { refresh_token: refreshToken },
          { headers: { "x-client-type": "web" } }
        );

        const refreshData = refreshResp.data;
        localStorage.setItem("access_token", refreshData.access_token);
        localStorage.setItem("refresh_token", refreshData.refresh_token);

        processQueue(null, refreshData.access_token);

        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === "function") {
            originalRequest.headers.set("Authorization", `Bearer ${refreshData.access_token}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${refreshData.access_token}`;
          }
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const extractData = <T>(response: any): T => response?.data?.data ?? response?.data ?? response;
