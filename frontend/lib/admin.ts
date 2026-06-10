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
export type AdminReportStatus = "PENDING" | "RESOLVED" | "REJECTED";
export type AdminLogCategory = "ALL" | "AUTH" | "USER" | "POST" | "ADMIN" | "ERROR";
export type AdminSystemLogModule =
  | "AUTH"
  | "USER"
  | "POST"
  | "REPORT"
  | "ADMIN"
  | "SYSTEM"
  | "STORAGE";
export type AdminLogSeverity = "INFO" | "WARNING" | "SECURITY" | "ERROR";
export type AdminLogStatus = "SUCCESS" | "FAILED" | "BLOCKED";

export type AdminUserListItem = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = AdminUserListItem & {
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
  items: AdminUserListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AdminUsersStats = {
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
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AdminPostsStats = {
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

export type AdminReport = {
  id: string;
  reason: string;
  description?: string | null;
  status: AdminReportStatus;
  appealStatus: "NONE" | "PENDING" | "REVIEWED";
  appealMessage?: string | null;
  appealEvidence?: string | null;
  appealedAt?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  reporter: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  post: {
    id: string;
    title: string;
    status: AdminPostStatus;
    price: number;
    address: string;
    city: string;
    district: string;
    createdAt: string;
    author: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string | null;
    };
    images: {
      id: string;
      imageUrl: string;
      order: number;
    }[];
  };
};

export type AdminReportsFilter = {
  page: number;
  limit: number;
  keyword: string;
  status: "" | AdminReportStatus;
};

export type AdminReportsData = {
  items: AdminReport[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AdminReportsStats = {
  total: number;
  pending: number;
  resolved: number;
  rejected: number;
};

export type AdminAppealDecision = "APPROVE" | "REJECT";

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

  const response = await api.get<{ data: AdminUsersData }>(`/admin/users?${params.toString()}`);
  return response.data.data;
};

export const getAdminUsersStats = async () => {
  const response = await api.get<{ data: AdminUsersStats }>("/admin/users/stats");
  return response.data.data;
};

export type AdminSystemLog = {
  id: string;
  actorId?: string | null;
  module: AdminSystemLogModule;
  action: string;
  targetType: string;
  targetId: string;
  description?: string | null;
  severity: AdminLogSeverity;
  status: AdminLogStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: AdminUserRole;
    avatarUrl?: string | null;
  } | null;
};

export type AdminSystemLogsFilter = {
  page: number;
  limit: number;
  keyword: string;
  category: AdminLogCategory;
  module: string;
  severity: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export type AdminSystemLogsData = {
  items: AdminSystemLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AdminSystemLogsStats = {
  total: number;
  security: number;
  errors: number;
  admin: number;
  categoryCounts: Record<AdminLogCategory, number>;
  modules: AdminSystemLogModule[];
};

export const getAdminUserDetail = async (userId: string) => {
  const response = await api.get<{ data: AdminUser }>(`/admin/users/${userId}`);
  return response.data.data;
};

export const updateAdminUser = async (
  userId: string,
  input: {
    role?: AdminUserRole;
    status?: AdminUserStatus;
  },
) => {
  const response = await api.patch<{ data: AdminUser }>(`/admin/users/${userId}`, input);
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

  const response = await api.get<{ data: AdminPostsData }>(`/admin/posts?${params.toString()}`);
  return response.data.data;
};

export const getAdminPostsStats = async () => {
  const response = await api.get<{ data: AdminPostsStats }>("/admin/posts/stats");
  return response.data.data;
};

export const getAdminReports = async (filter: AdminReportsFilter) => {
  const params = new URLSearchParams();
  params.set("page", String(filter.page));
  params.set("limit", String(filter.limit));

  if (filter.keyword.trim()) {
    params.set("keyword", filter.keyword.trim());
  }

  if (filter.status) {
    params.set("status", filter.status);
  }

  const response = await api.get<{ data: AdminReportsData }>(`/admin/reports?${params.toString()}`);
  return response.data.data;
};

export const getAdminReportsStats = async (filter: {
  keyword: string;
}): Promise<AdminReportsStats> => {
  const params = new URLSearchParams();

  if (filter.keyword.trim()) {
    params.set("keyword", filter.keyword.trim());
  }

  const query = params.toString();
  const response = await api.get<{ data: AdminReportsStats }>(
    `/admin/reports/stats${query ? `?${query}` : ""}`,
  );
  return response.data.data;
};

export const resolveAdminReport = async (
  reportId: string,
  status: Extract<AdminReportStatus, "RESOLVED" | "REJECTED">,
) => {
  const response = await api.patch<{ data: { report: AdminReport } }>(`/admin/reports/${reportId}`, {
    status,
  });
  return response.data.data.report;
};

export const reviewAdminReportAppeal = async (
  reportId: string,
  decision: AdminAppealDecision,
) => {
  const response = await api.patch<{ data: { report: AdminReport } }>(
    `/admin/reports/${reportId}/appeal`,
    {
      decision,
    },
  );
  return response.data.data.report;
};

export const updateAdminPostStatus = async (postId: string, status: AdminPostStatus) => {
  const response = await api.patch(`/posts/${postId}`, { status });
  return response.data.data;
};

export const getAdminSystemLogs = async (filter: AdminSystemLogsFilter) => {
  const params = new URLSearchParams();
  params.set("page", String(filter.page));
  params.set("limit", String(filter.limit));

  if (filter.keyword.trim()) {
    params.set("keyword", filter.keyword.trim());
  }

  if (filter.category && filter.category !== "ALL") {
    params.set("category", filter.category);
  }

  if (filter.module.trim()) {
    params.set("module", filter.module.trim());
  }

  if (filter.severity.trim()) {
    params.set("severity", filter.severity.trim());
  }

  if (filter.status.trim()) {
    params.set("status", filter.status.trim());
  }

  if (filter.dateFrom) {
    params.set("dateFrom", filter.dateFrom);
  }

  if (filter.dateTo) {
    params.set("dateTo", filter.dateTo);
  }

  const response = await api.get<{ data: AdminSystemLogsData }>(`/admin/logs?${params.toString()}`);
  return response.data.data;
};

export const getAdminSystemLogsStats = async (
  filter: Omit<AdminSystemLogsFilter, "page" | "limit" | "category">,
) => {
  const params = new URLSearchParams();

  if (filter.keyword.trim()) {
    params.set("keyword", filter.keyword.trim());
  }

  if (filter.module.trim()) {
    params.set("module", filter.module.trim());
  }

  if (filter.severity.trim()) {
    params.set("severity", filter.severity.trim());
  }

  if (filter.status.trim()) {
    params.set("status", filter.status.trim());
  }

  if (filter.dateFrom) {
    params.set("dateFrom", filter.dateFrom);
  }

  if (filter.dateTo) {
    params.set("dateTo", filter.dateTo);
  }

  const response = await api.get<{ data: AdminSystemLogsStats }>(
    `/admin/logs/stats?${params.toString()}`,
  );
  return response.data.data;
};
