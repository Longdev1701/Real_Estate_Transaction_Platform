"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Home,
  Menu,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAdminReady } from "@/hooks/useAdminReady";

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: Home },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/posts", label: "Bài đăng", icon: ClipboardList },
  { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/admin/logs", label: "Nhật ký hệ thống", icon: ShieldCheck },
];

const isActivePath = (pathname: string, href: string) =>
  href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

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
  const { user, isChecking, isReady } = useAdminReady();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (isChecking || !isReady || !user) {
    return (
      <div className="theme-admin-stage flex min-h-screen items-center justify-center text-[var(--secondary-foreground)]">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!mobileSidebarOpen) {
      return;
    }

    event.preventDefault();
    setMobileSidebarOpen(false);

    window.setTimeout(() => {
      if (pathname !== href) {
        router.push(href);
      }
    }, 0);
  };

  return (
    <div className="theme-admin-stage min-h-screen text-[var(--foreground)]">
      <div className="theme-admin-overlay pointer-events-none fixed inset-0" />

      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Đóng điều hướng"
          className="theme-overlay-dim fixed inset-0 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <div className="relative min-h-screen">
        <aside
          className={`theme-admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r backdrop-blur-xl transition-transform lg:w-56 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex h-20 items-center gap-3 px-5">
          <div className="theme-admin-icon-blue flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-border)] text-[var(--accent)]">
            <BuildingGlyph />
          </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold tracking-wide">TrustEstate</p>
              <p className="text-xs text-[var(--muted-foreground)]">Bảng điều khiển quản trị</p>
            </div>
          </div>

          <nav className="space-y-2 px-3 py-4">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleNavClick(event, item.href)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "theme-admin-nav-active"
                      : "theme-admin-nav-idle"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/"
              className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">Về trang khách</span>
            </Link>
          </nav>

          <div className="theme-admin-user-card mx-3 mb-3 mt-auto rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <AdminAvatar name={user.name} className="theme-admin-avatar" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{getPrimaryName(user.name)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Quản trị viên</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 lg:pl-56">
          <header className="theme-admin-header sticky top-0 z-20 flex min-h-20 items-center justify-between gap-5 border-b px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
                {subtitle ? (
                  <p className="mt-1.5 hidden max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] md:block">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {action}
              <div className="hidden items-center gap-3 border-l border-[var(--border)] pl-4 md:flex">
                <AdminAvatar
                  name={user.name}
                  className="theme-admin-avatar"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{getPrimaryName(user.name)}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Quản trị viên</p>
                </div>
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
      className={`theme-admin-card rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] backdrop-blur-xl ${className}`}
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
    blue: "theme-admin-icon-blue",
    violet: "theme-admin-icon-violet",
    green: "theme-admin-icon-green",
    orange: "theme-admin-icon-orange",
    red: "theme-admin-icon-red",
  };

  const glows = {
    blue: "theme-admin-halo-info",
    violet: "theme-admin-halo-accent",
    green: "theme-admin-halo-success",
    orange: "theme-admin-halo-warning",
    red: "theme-admin-halo-danger",
  };

  return (
    <NeonCard className={`relative overflow-hidden ${compact ? "p-3.5" : "p-5"}`}>
      <div className={`absolute inset-x-8 bottom-0 h-14 rounded-t-full blur-2xl ${glows[tone]}`} />
      <div className={`relative flex items-start ${compact ? "gap-3" : "gap-4"}`}>
        <div
          className={`grid shrink-0 place-items-center rounded-full shadow-[0_0_24px_color-mix(in_srgb,currentColor_22%,transparent)] ${colors[tone]} ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
        <div className="min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} text-[var(--muted-foreground)]`}>{title}</p>
          <p className={`${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-bold tracking-tight`}>
            {value}
          </p>
          <p
            className={`${compact ? "mt-1.5 text-xs" : "mt-3 text-sm"} ${
              tone === "red" ? "text-[var(--danger)]" : "text-[var(--success)]"
            }`}
          >
            {delta} <span className="text-[var(--muted-foreground)]">so với tháng trước</span>
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
    blue: "var(--primary)",
    violet: "var(--info-foreground)",
    green: "var(--success)",
    orange: "var(--badge-warning-text)",
    red: "var(--danger)",
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

function AdminAvatar({
  name,
  className = "",
}: {
  name?: string;
  className?: string;
}) {
  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-bold ${className}`}
    >
      {(name || "A").charAt(0).toUpperCase()}
    </div>
  );
}

function getPrimaryName(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return "Admin";

  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? parts.slice(-2).join(" ") : parts[0];
}

function BuildingGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
      <path d="M6 27V11l8-5v21M14 27V3l12 7v17" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 14h2M9 19h2M18 10h2M18 15h2M18 20h2M23 13h2M23 18h2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function AddUserButton() {
  return (
    <button className="btn-primary hidden h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 font-semibold sm:inline-flex">
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
