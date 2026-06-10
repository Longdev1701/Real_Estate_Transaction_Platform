"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

type PaginationItem = number | "ellipsis";

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}

export function AdminPagination({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isLoading || currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="theme-admin-tab inline-flex min-w-10 items-center gap-1 rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Truoc</span>
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${currentPage}-${index}`}
            className="inline-flex min-w-10 items-center justify-center px-1 text-[var(--muted-foreground)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <button
            key={item}
            type="button"
            disabled={isLoading || item === currentPage}
            onClick={() => onPageChange(item)}
            className={`min-w-10 rounded-lg border px-3 py-2 ${
              item === currentPage ? "theme-admin-tab-active" : "theme-admin-tab"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={isLoading || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="theme-admin-tab inline-flex min-w-10 items-center gap-1 rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>Sau</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
