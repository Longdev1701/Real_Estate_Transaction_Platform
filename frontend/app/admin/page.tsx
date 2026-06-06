"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flag,
  TrendingUp,
  Users,
} from "lucide-react";

import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminDashboard,
  type AdminChartPoint,
  type AdminDashboardData,
} from "@/lib/admin";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatNumber = (value: number) => numberFormatter.format(value);

const formatDelta = (value: number) => {
  const prefix = value >= 0 ? "↑" : "↓";
  return `${prefix} ${Math.abs(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}%`;
};

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminDashboard();
        if (!ignore) {
          setDashboard(data);
        }
      } catch {
        if (!ignore) {
          setError("Không thể tải dữ liệu tổng quan admin.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AdminShell title="Tổng quan">
      <div className="space-y-6">
        {error && (
          <NeonCard className="theme-badge-danger p-4 text-sm">
            {error}
          </NeonCard>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Users}
            title="Tổng người dùng"
            value={isLoading ? "..." : formatNumber(dashboard?.stats.users.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(dashboard?.stats.users.deltaPercent ?? 0)}
            tone="blue"
          />
          <StatCard
            icon={ClipboardList}
            title="Tổng bài đăng"
            value={isLoading ? "..." : formatNumber(dashboard?.stats.posts.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(dashboard?.stats.posts.deltaPercent ?? 0)}
            tone="violet"
          />
          <StatCard
            icon={CheckCircle2}
            title="Bài đăng hoạt động"
            value={isLoading ? "..." : formatNumber(dashboard?.stats.activePosts.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(dashboard?.stats.activePosts.deltaPercent ?? 0)}
            tone="green"
          />
          <StatCard
            icon={FileText}
            title="Bài bị ẩn"
            value={isLoading ? "..." : formatNumber(dashboard?.stats.hiddenPosts.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(dashboard?.stats.hiddenPosts.deltaPercent ?? 0)}
            tone="orange"
          />
          <StatCard
            icon={Flag}
            title="Báo cáo chờ xử lý"
            value={isLoading ? "..." : formatNumber(dashboard?.stats.pendingReports.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(dashboard?.stats.pendingReports.deltaPercent ?? 0)}
            tone="red"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardChartCard
            title="Tăng trưởng người dùng"
            totalLabel="Tổng người dùng"
            createdLabel="Người dùng mới"
            data={dashboard?.charts.users ?? []}
            isLoading={isLoading}
            tone="blue"
          />
          <DashboardChartCard
            title="Tăng trưởng bài đăng"
            totalLabel="Bài đăng hoạt động"
            createdLabel="Bài đăng mới"
            data={dashboard?.charts.posts ?? []}
            isLoading={isLoading}
            tone="violet"
          />
        </div>
      </div>
    </AdminShell>
  );
}

function DashboardChartCard({
  title,
  totalLabel,
  createdLabel,
  data,
  isLoading,
  tone,
}: {
  title: string;
  totalLabel: string;
  createdLabel: string;
  data: AdminChartPoint[];
  isLoading: boolean;
  tone: "blue" | "violet";
}) {
  const summary = useMemo(() => {
    const latest = data.at(-1);
    const previous = data.at(-2);
    const totalCreated = data.reduce((sum, item) => sum + item.created, 0);
    const averageCreated = data.length ? Math.round(totalCreated / data.length) : 0;
    const latestDelta = latest && previous ? latest.total - previous.total : 0;

    return {
      currentTotal: latest?.total ?? 0,
      totalCreated,
      averageCreated,
      latestDelta,
    };
  }, [data]);

  const palette =
    tone === "blue"
      ? {
          primary: "var(--chart-primary)",
          secondary: "var(--chart-primary-soft)",
          glow: "shadow-[0_14px_28px_color-mix(in_srgb,var(--chart-primary)_12%,transparent)] dark:shadow-[0_18px_38px_color-mix(in_srgb,var(--chart-primary)_22%,transparent)]",
          badge:
            "border-[color:var(--accent-border)] bg-[color:color-mix(in_srgb,var(--accent)_10%,var(--surface))] text-[var(--accent)]",
        }
      : {
          primary: "var(--chart-secondary)",
          secondary: "var(--chart-secondary-soft)",
          glow: "shadow-[0_14px_28px_color-mix(in_srgb,var(--chart-secondary)_12%,transparent)] dark:shadow-[0_18px_38px_color-mix(in_srgb,var(--chart-secondary)_22%,transparent)]",
          badge:
            "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]",
        };

  return (
    <NeonCard className={`overflow-hidden p-5 ${palette.glow}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl border p-2 shadow-[0_8px_18px_color-mix(in_srgb,var(--muted-foreground)_16%,transparent)] ${palette.badge}`}>
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Dữ liệu 7 ngày gần nhất</p>
          </div>
        </div>
        <span className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--secondary-foreground)] shadow-[0_4px_14px_color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]">
          7 ngày qua
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <MetricItem label={totalLabel} value={formatNumber(summary.currentTotal)} />
        <MetricItem label={createdLabel} value={formatNumber(summary.totalCreated)} />
        <MetricItem label="Trung bình/ngày" value={formatNumber(summary.averageCreated)} />
        <MetricItem
          label="Tăng hôm nay"
          value={`${summary.latestDelta >= 0 ? "+" : ""}${formatNumber(summary.latestDelta)}`}
        />
      </div>

      {isLoading ? (
        <div className="grid h-72 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] text-sm text-[var(--muted-foreground)]">
          Đang tải biểu đồ...
        </div>
      ) : (
        <SevenDayChart
          data={data}
          totalLabel={totalLabel}
          createdLabel={createdLabel}
          primaryColor={palette.primary}
          secondaryColor={palette.secondary}
        />
      )}
    </NeonCard>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_20px_var(--shadow-glow)]">
      <p className="text-[11px] uppercase tracking-wide text-[var(--secondary-foreground)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function SevenDayChart({
  data,
  totalLabel,
  createdLabel,
  primaryColor,
  secondaryColor,
}: {
  data: AdminChartPoint[];
  totalLabel: string;
  createdLabel: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const width = 680;
  const height = 300;
  const left = 54;
  const right = 22;
  const top = 24;
  const bottom = 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.total, item.created]));
  const gradientId = `bar-${primaryColor.includes("chart-secondary") ? "secondary" : "primary"}`;
  const glowId = `glow-${primaryColor.includes("chart-secondary") ? "secondary" : "primary"}`;
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxValue / 4) * (4 - index)),
  );
  const barWidth = data.length ? Math.min(34, chartWidth / data.length / 2.6) : 0;

  const getX = (index: number) =>
    left + (data.length <= 1 ? chartWidth / 2 : (chartWidth / (data.length - 1)) * index);
  const getY = (value: number) => top + chartHeight - (value / maxValue) * chartHeight;
  const linePath = data
    .map((item, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item.total)}`)
    .join(" ");

  if (!data.length) {
    return (
      <div className="grid h-72 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] text-sm text-[var(--muted-foreground)]">
        Chưa có dữ liệu 7 ngày gần nhất.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_24px_var(--shadow-glow)]">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[var(--secondary-foreground)]">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="h-2.5 w-8 rounded-full shadow-[0_0_10px_var(--glow-soft)]" style={{ backgroundColor: primaryColor }} />
          {totalLabel}
        </span>
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="h-2.5 w-8 rounded-full shadow-[0_0_10px_var(--glow-strong)]" style={{ backgroundColor: secondaryColor }} />
          {createdLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--success-foreground)]">
          <TrendingUp className="h-3.5 w-3.5" />
          cập nhật theo ngày
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.75" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.12" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
              />
              <text x={left - 10} y={y + 4} textAnchor="end" className="fill-[var(--chart-label)] text-[11px]">
                {formatCompact(tick)}
              </text>
            </g>
          );
        })}

        {data.map((item, index) => {
          const x = getX(index);
          const barTop = getY(item.created);
          const barHeight = top + chartHeight - barTop;
          return (
            <g key={item.date}>
              <rect
                x={x - barWidth / 2}
                y={barTop}
                width={barWidth}
                height={barHeight}
                rx="7"
                fill={`url(#${gradientId})`}
              />
              <text
                x={x}
                y={Math.max(top + 12, barTop - 7)}
                textAnchor="middle"
                className="fill-[var(--chart-label)] text-[10px] font-semibold"
              >
                {item.created}
              </text>
              <text x={x} y={height - 20} textAnchor="middle" className="fill-[var(--chart-label)] text-[11px]">
                {item.label}
              </text>
            </g>
          );
        })}

        <path
          d={linePath}
          fill="none"
          stroke={primaryColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />

        {data.map((item, index) => {
          const x = getX(index);
          const y = getY(item.total);
          return (
            <g key={`${item.date}-point`}>
              <circle cx={x} cy={y} r="5" fill={primaryColor} stroke="var(--surface)" strokeWidth="2.5" />
              <text x={x} y={y - 13} textAnchor="middle" className="fill-[var(--foreground)] text-[10px] font-semibold">
                {formatCompact(item.total)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}tr`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}k`;
  }

  return String(value);
}
