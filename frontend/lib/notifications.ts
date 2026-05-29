export type NotificationType = "MESSAGE" | "POST" | "REPORT" | "SYSTEM";

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  relatedId?: string | null;
  createdAt: string;
};

export type NotificationListData = {
  items: NotificationItem[];
  unreadCount: number;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  MESSAGE: "Tin nhắn",
  POST: "Bài đăng",
  REPORT: "Báo cáo",
  SYSTEM: "Hệ thống",
};

export const getNotificationHref = (notification: NotificationItem) => {
  if (!notification.relatedId) return "/notifications";

  if (notification.type === "MESSAGE") {
    return `/messages/${notification.relatedId}`;
  }

  if (notification.type === "POST") {
    return `/posts/${notification.relatedId}`;
  }

  return "/notifications";
};

export const formatNotificationTime = (rawDate: string) => {
  const timestamp = new Date(rawDate).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return diffDays === 1 ? "1 ngày trước" : `${diffDays} ngày trước`;
  if (diffHours > 0) return diffHours === 1 ? "1 giờ trước" : `${diffHours} giờ trước`;
  if (diffMinutes > 0) return diffMinutes === 1 ? "1 phút trước" : `${diffMinutes} phút trước`;
  return "Vừa xong";
};
