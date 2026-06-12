import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/stores/auth.store";

const isServer = typeof window === "undefined";
const apiURL = process.env.NEXT_PUBLIC_API_URL;
let baseURL = apiURL
  ? apiURL.replace(/\/$/, "").endsWith("/api")
    ? apiURL.replace(/\/$/, "")
    : `${apiURL.replace(/\/$/, "")}/api`
  : undefined;

if (isServer && baseURL?.startsWith("/")) {
  baseURL = `http://127.0.0.1:4000${baseURL}`;
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshTokenResponse = {
  data: {
    user: any;
    tokens: {
      accessToken: string;
    };
  };
};

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

const isAuthEndpoint = (url?: string) =>
  typeof url === "string" &&
  (url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/logout"));

export const refreshAccessToken = async () => {
  const { setTokens, logout } = useAuthStore.getState();

  if (!refreshPromise) {
    refreshPromise = api
      .post<RefreshTokenResponse>("/auth/refresh-token", undefined, {
        headers: {
          Authorization: undefined,
        },
      })
      .then((response) => {
        const nextAccessToken = response.data.data.tokens.accessToken;
        setTokens(nextAccessToken);
        return nextAccessToken;
      })
      .catch((error) => {
        logout();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || originalRequest._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint(originalRequest.url)) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
