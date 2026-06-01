import { api } from "@/lib/api";
import type { PostType, PropertyType } from "@/lib/posts";

export type AdminChartPoint = {
  date: string;
  label: string;
  total: number;
  created: number;
};

export type AdminDashboardData = {
  stats: {
    users: {
      total: number;
      banned: number;
      deltaPercent: number;
    };
    posts: {
      total: number;
      deltaPercent: number;
    };
    activePosts: {
      total: number;
      deltaPercent: number;
    };
    hiddenPosts: {
      total: number;
      deltaPercent: number;
    };
    pendingReports: {
      total: number;
      deltaPercent: number;
    };
  };
  charts: {
    users: AdminChartPoint[];
    posts: AdminChartPoint[];
  };
};

export type AdminUserRole = "USER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "BANNED";
export type AdminPostStatus = "ACTIVE" | "HIDDEN" | "BANNED";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
  posts: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }[];
  _count: {
    posts: number;
    reports: number;
    comments: number;
    savedPosts: number;
  };
};

export type AdminUsersFilter = {
  page: number;
  limit: number;
  keyword: string;
  role: "" | AdminUserRole;
  status: "" | AdminUserStatus;
};

export type AdminUsersData = {
  items: AdminUser[];
  stats: {
    totalUsers: {
      total: number;
      deltaPercent: number;
    };
    newUsersThisMonth: {
      total: number;
      deltaPercent: number;
    };
    activeUsers: {
      total: number;
      deltaPercent: number;
    };
    bannedUsers: {
      total: number;
      deltaPercent: number;
    };
    admins: {
      total: number;
      deltaPercent: number;
    };
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AdminPost = {
  id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  address: string;
  city: string;
  district: string;
  ward?: string | null;
  propertyType: PropertyType;
  postType: PostType;
  status: AdminPostStatus;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  images: {
    id: string;
    imageUrl: string;
    order: number;
  }[];
  _count: {
    reports: number;
    comments: number;
    savedBy: number;
  };
};

export type AdminPostsFilter = {
  page: number;
  limit: number;
  keyword: string;
  status: "" | AdminPostStatus;
  propertyType: "" | PropertyType;
  postType: "" | PostType;
  minPrice: string;
  maxPrice: string;
};

export type AdminPostsData = {
  items: AdminPost[];
  stats: {
    totalPosts: {
      total: number;
      deltaPercent: number;
    };
    activePosts: {
      total: number;
      deltaPercent: number;
    };
    hiddenPosts: {
      total: number;
      deltaPercent: number;
    };
    bannedPosts: {
      total: number;
      deltaPercent: number;
    };
    pendingReports: {
      total: number;
      deltaPercent: number;
    };
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export const getAdminDashboard = async () => {
  const response = await api.get<{ data: AdminDashboardData }>("/admin/dashboard");
  return response.data.data;
};

export const getAdminUsers = async (filter: AdminUsersFilter) => {
  const params = new URLSearchParams();
  params.set("page", String(filter.page));
  params.set("limit", String(filter.limit));

  if (filter.keyword.trim()) {
    params.set("keyword", filter.keyword.trim());
  }

  if (filter.role) {
    params.set("role", filter.role);
  }

  if (filter.status) {
    params.set("status", filter.status);
  }

  const response = await api.get<{ data: AdminUsersData }>(
    `/admin/users?${params.toString()}`,
  );
  return response.data.data;
};

export const updateAdminUser = async (
  userId: string,
  input: {
    role?: AdminUserRole;
    status?: AdminUserStatus;
  },
) => {
  const response = await api.patch<{ data: AdminUser }>(
    `/admin/users/${userId}`,
    input,
  );
  return response.data.data;
};

export const getAdminPosts = async (filter: AdminPostsFilter) => {
  const params = new URLSearchParams();
  params.set("page", String(filter.page));
  params.set("limit", String(filter.limit));

  Object.entries(filter).forEach(([key, rawValue]) => {
    if (key === "page" || key === "limit") {
      return;
    }

    const value = String(rawValue).trim();
    if (value) {
      params.set(key, value);
    }
  });

  const response = await api.get<{ data: AdminPostsData }>(
    `/admin/posts?${params.toString()}`,
  );
  return response.data.data;
};

export const updateAdminPostStatus = async (
  postId: string,
  status: AdminPostStatus,
) => {
  const response = await api.patch(`/posts/${postId}`, { status });
  return response.data.data;
};
