import { Filter, Newspaper, Search } from "lucide-react";

export function PostListSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="hidden min-h-0 xl:block">
        <div className="sticky top-20 h-full max-h-[calc(100vh-100px)] space-y-5 overflow-y-auto pr-1">
          <div className="glass-card p-2.5">
            <nav className="space-y-1">
              <div className="theme-nav-active border flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold">
                <Newspaper className="h-3.5 w-3.5" />
                Bảng tin
              </div>
            </nav>
          </div>
          <div className="glass-card p-3.5">
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Danh mục</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="theme-skeleton h-8 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="no-scrollbar min-w-0 xl:h-full xl:max-h-[calc(100vh-100px)] xl:overflow-y-auto xl:pr-1">
        <div className="space-y-5">
          <section className="hidden md:flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span>Trang chủ</span>
            <span>/</span>
            <span className="text-[var(--foreground)]">Bài đăng</span>
          </section>

          <div className="glass-card p-4 sm:p-5 md:p-6">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <div className="theme-skeleton h-12 w-full rounded-xl" />
                </div>
                <div className="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold sm:min-w-36">
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="theme-skeleton h-9 w-20 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Bảng tin bất động sản</h2>
              <div className="theme-skeleton mt-2 h-4 w-48 rounded" />
            </div>
          </div>

          <div className="space-y-5">
            {[1, 2, 3].map((index) => (
              <div key={index} className="glass-card overflow-hidden rounded-2xl p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className="theme-skeleton h-11 w-11 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="theme-skeleton h-4 w-1/3 rounded" />
                    <div className="theme-skeleton h-3 w-1/4 rounded" />
                  </div>
                </div>
                <div className="theme-skeleton mt-4 h-6 w-3/4 rounded" />
                <div className="theme-skeleton mt-2 h-4 w-1/2 rounded" />
                <div className="theme-skeleton mt-5 aspect-[4/3] w-full rounded-xl md:aspect-auto md:h-64" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="hidden min-h-0 xl:block">
        <div className="no-scrollbar sticky top-20 h-full max-h-[calc(100vh-100px)] overflow-y-auto xl:space-y-5">
          <div className="glass-card w-full rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="theme-badge-info rounded-xl p-1.5">
                  <Filter className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Bộ lọc tìm kiếm</h2>
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="theme-skeleton mb-2 h-3 w-16 rounded" />
                  <div className="theme-skeleton h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
