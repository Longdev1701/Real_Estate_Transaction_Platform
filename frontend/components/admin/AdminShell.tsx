"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  Home,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";

const SIDEBAR_WIDTH = 224;

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: Home },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/posts", label: "Bài đăng", icon: ClipboardList },
  { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/admin/logs", label: "Nhật ký hệ thống", icon: ShieldCheck },
];

export function AdminShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [hasHydrated, router, user]);

  if (!hasHydrated || !user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] text-blue-100">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.25),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(14,165,233,0.18),transparent_26%),linear-gradient(180deg,#020817,#071426_54%,#020817)]" />
      <div className="relative min-h-screen">
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden overflow-hidden border-r border-blue-400/20 bg-slate-950/68 shadow-[0_0_48px_rgba(37,99,235,0.18)] backdrop-blur-xl lg:flex lg:flex-col"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="flex h-20 items-center gap-3 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/50 bg-blue-500/10 text-blue-300 shadow-[0_0_24px_rgba(59,130,246,0.6)]">
              <BuildingGlyph />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold tracking-wide">TrustEstate</p>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>

          <nav className="space-y-2 px-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "border-blue-400/60 bg-blue-600/20 text-white shadow-[0_0_24px_rgba(37,99,235,0.42)]"
                      : "border-transparent text-gray-300 hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-blue-200" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mx-3 mt-auto rounded-2xl border border-blue-400/20 bg-blue-950/25 p-4 shadow-[0_0_30px_rgba(37,99,235,0.16)]">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold">Hoạt động hôm nay</p>
            </div>
            <div className="space-y-2 text-xs">
              <StatusMetric label="Bài đăng mới" value="Live" tone="blue" />
              <StatusMetric label="User mới" value="Sync" tone="green" />
              <StatusMetric label="Report mới" value="Watch" tone="amber" />
            </div>
          </div>

          <div className="m-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <AdminAvatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-gray-400">Quản trị viên</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </aside>

        <section className="min-w-0 lg:pl-56">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-5 border-b border-blue-400/20 bg-slate-950/70 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
                {subtitle && (
                  <p className="mt-1.5 hidden max-w-3xl text-sm leading-6 text-gray-300 md:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {action}
              <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-blue-500/10">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
                  5
                </span>
              </button>
              <button className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-blue-500/10 md:inline-flex">
                <Settings className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-3 border-l border-white/10 pl-4 md:flex">
                <AdminAvatar name={user.name} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Admin</p>
                  <p className="text-xs text-gray-400">Quản trị viên</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6">{children}</main>
        </section>
      </div>
    </div>
  );
}

export function NeonCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-blue-300/20 bg-slate-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_30px_rgba(37,99,235,0.16)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  title,
  value,
  delta,
  tone,
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  delta: string;
  tone: "blue" | "violet" | "green" | "orange" | "red";
  compact?: boolean;
}) {
  const colors = {
    blue: "text-blue-300 bg-blue-500/15 shadow-blue-500/40",
    violet: "text-violet-300 bg-violet-500/15 shadow-violet-500/40",
    green: "text-emerald-300 bg-emerald-500/15 shadow-emerald-500/40",
    orange: "text-amber-300 bg-amber-500/15 shadow-amber-500/40",
    red: "text-red-300 bg-red-500/15 shadow-red-500/40",
  };

  return (
    <NeonCard className={`relative overflow-hidden ${compact ? "p-3.5" : "p-5"}`}>
      <div className="absolute inset-x-8 bottom-0 h-12 rounded-t-full bg-blue-500/10 blur-2xl" />
      <div className={`relative flex items-start ${compact ? "gap-3" : "gap-4"}`}>
        <div
          className={`grid shrink-0 place-items-center rounded-full shadow-[0_0_24px] ${colors[tone]} ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
        <div className="min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} text-gray-300`}>{title}</p>
          <p className={`${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-bold tracking-tight`}>
            {value}
          </p>
          <p className={`${compact ? "mt-1.5 text-xs" : "mt-3 text-sm"} ${tone === "red" ? "text-red-300" : "text-emerald-300"}`}>
            {delta} <span className="text-gray-400">so với tháng trước</span>
          </p>
        </div>
      </div>
      <Sparkline tone={tone} compact={compact} />
    </NeonCard>
  );
}

function Sparkline({
  tone,
  compact = false,
}: {
  tone: "blue" | "violet" | "green" | "orange" | "red";
  compact?: boolean;
}) {
  const stroke = {
    blue: "#3b82f6",
    violet: "#8b5cf6",
    green: "#22c55e",
    orange: "#f59e0b",
    red: "#ef4444",
  }[tone];

  return (
    <svg viewBox="0 0 220 58" className={`relative mt-2 w-full ${compact ? "h-8" : "h-14"}`}>
      <defs>
        <linearGradient id={`spark-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.45" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 44 C18 20 26 52 42 30 S66 18 82 34 S112 38 126 20 S154 48 170 26 S198 10 220 22 L220 58 L0 58 Z"
        fill={`url(#spark-${tone})`}
      />
      <path
        d="M0 44 C18 20 26 52 42 30 S66 18 82 34 S112 38 126 20 S154 48 170 26 S198 10 220 22"
        fill="none"
        stroke={stroke}
        strokeWidth={compact ? "2" : "2.4"}
      />
    </svg>
  );
}

function StatusMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber";
}) {
  const colors = {
    blue: "bg-blue-400",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-gray-300">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
        <span className={`h-1.5 w-1.5 rounded-full ${colors[tone]}`} />
        {value}
      </span>
    </div>
  );
}

function AdminAvatar({ name }: { name?: string }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/30 bg-blue-500/15 text-sm font-bold text-blue-100">
      {(name || "A").charAt(0).toUpperCase()}
    </div>
  );
}

function BuildingGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
      <path d="M6 27V11l8-5v21M14 27V3l12 7v17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 14h2M9 19h2M18 10h2M18 15h2M18 20h2M23 13h2M23 18h2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function AddUserButton() {
  return (
    <button className="hidden h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] transition hover:bg-blue-500 sm:inline-flex">
      <Plus className="h-4 w-4" />
      Thêm người dùng
    </button>
  );
}

export const adminTableUsers = [
  ["Nguyễn Văn Minh", "minh.nguyen@trustestate.vn", "Quản trị viên", "Đã xác thực", "15/01/2024"],
  ["Trần Thị Hương", "huong.tran@trustestate.vn", "Người dùng", "Đã xác thực", "22/02/2024"],
  ["Lê Quang Huy", "huy.le@trustestate.vn", "Người dùng", "Đã xác thực", "05/03/2024"],
  ["Phạm Thu Trang", "trang.pham@trustestate.vn", "Người dùng", "Bị khóa", "18/03/2024"],
  ["Hoàng Quốc Bảo", "bao.hoang@trustestate.vn", "Người dùng", "Đã xác thực", "25/03/2024"],
  ["Đỗ Mỹ Linh", "linh.do@trustestate.vn", "Người dùng", "Đã xác thực", "02/04/2024"],
  ["Vũ Đức Anh", "anh.vu@trustestate.vn", "Người dùng", "Bị khóa", "10/04/2024"],
  ["Nguyễn Thảo Vy", "vy.nguyen@trustestate.vn", "Người dùng", "Đã xác thực", "12/04/2024"],
];
