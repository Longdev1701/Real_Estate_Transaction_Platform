import type {
  AdminPostsFilter,
  AdminReportsFilter,
  AdminSystemLogsFilter,
  AdminUsersFilter,
} from "@/lib/admin";

type LogsStatsFilter = Omit<AdminSystemLogsFilter, "page" | "limit" | "category">;

export const adminQueryKeys = {
  dashboard: () => ["admin", "dashboard"] as const,
  users: {
    list: (filter: AdminUsersFilter) => ["admin", "users", filter] as const,
    stats: () => ["admin", "users", "stats"] as const,
    detail: (userId: string | null) => ["admin", "users", "detail", userId] as const,
  },
  posts: {
    list: (filter: AdminPostsFilter) => ["admin", "posts", filter] as const,
    stats: () => ["admin", "posts", "stats"] as const,
  },
  reports: {
    list: (filter: AdminReportsFilter) => ["admin", "reports", filter] as const,
    stats: (keyword: string) => ["admin", "reports", "stats", { keyword }] as const,
  },
  logs: {
    list: (filter: AdminSystemLogsFilter) => ["admin", "logs", filter] as const,
    stats: (filter: LogsStatsFilter) => ["admin", "logs", "stats", filter] as const,
  },
} as const;
