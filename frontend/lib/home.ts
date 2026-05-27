import type { Post, PropertyType } from "./posts";

export type HomeCategory = {
  propertyType: PropertyType;
  label: string;
  count: number;
};

export type HomeData = {
  stats: {
    activePostCount: number;
    sellPostCount: number;
    rentPostCount: number;
    userCount: number;
  };
  featuredPosts: Post[];
  categories: HomeCategory[];
  popularLocations: Array<{
    city: string;
    count: number;
  }>;
};

const getApiBaseUrl = () => {
  const apiURL = process.env.NEXT_PUBLIC_API_URL;
  if (!apiURL) {
    return "http://localhost:4000/api";
  }

  const normalizedURL = apiURL.replace(/\/$/, "");
  return normalizedURL.endsWith("/api") ? normalizedURL : `${normalizedURL}/api`;
};

export const getHomeData = async (): Promise<HomeData | null> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/home`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: HomeData };
    return payload.data ?? null;
  } catch {
    return null;
  }
};
