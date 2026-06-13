import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Home,
  Landmark,
  LandPlot,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { getHomeData } from "@/lib/home";
import {
  formatArea,
  formatCompactPrice,
  formatLocation,
  formatPrice,
  getPrimaryImage,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
  type PropertyType,
} from "@/lib/posts";

import { CompareButton } from "@/components/post/CompareButton";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { HomeSearchForm } from "@/components/home/HomeSearchForm";

const sectionContainerClass = "mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8";

const propertyIcons: Record<PropertyType, LucideIcon> = {
  APARTMENT: Building2,
  HOUSE: Home,
  LAND: LandPlot,
  ROOM: Home,
  VILLA: Landmark,
  OFFICE: Building2,
  SHOPHOUSE: Store,
  WAREHOUSE: Warehouse,
};

const categoryColors: Record<PropertyType, string> = {
  APARTMENT: "theme-badge-info",
  HOUSE: "theme-badge-success",
  LAND: "theme-badge-success",
  ROOM: "theme-badge-premium",
  VILLA: "theme-badge-danger",
  OFFICE: "theme-badge-info",
  SHOPHOUSE: "theme-badge-warning",
  WAREHOUSE: "theme-chip",
};

const formatCompactNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

function PropertyCard({ post, index }: { post: Post; index: number }) {
  const tag = index === 0 ? "Mới" : index === 1 ? "Hot" : "";
  const tagClass = index === 0 ? "theme-button-success" : "theme-button-danger-solid";

  return (
    <Link
      href={`/posts/${post.id}`}
      className="glass-card group flex h-full flex-col overflow-hidden transition hover:border-[var(--accent-border)] hover:bg-[var(--hover)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getPrimaryImage(post)}
          alt={post.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {tag && (
          <span className={`absolute left-3 top-3 rounded-lg px-3 py-1 text-xs font-bold uppercase ${tagClass}`}>
            {tag}
          </span>
        )}

        <div className="absolute right-3 top-3 z-10">
          <CompareButton post={post} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[3rem] font-semibold text-[var(--foreground)]">{post.title}</h3>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--secondary-foreground)]">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatLocation(post)}</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--secondary-foreground)]">
          <span className="theme-chip rounded-lg px-2.5 py-1">{postTypeLabels[post.postType]}</span>
          <span className="theme-chip rounded-lg px-2.5 py-1">{propertyTypeLabels[post.propertyType]}</span>
          <span className="theme-chip inline-flex items-center gap-1 rounded-lg px-2.5 py-1">
            <Ruler className="h-3.5 w-3.5" />
            {formatArea(post.area)}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="min-w-0 truncate text-2xl font-bold text-[var(--accent)] tabular-nums" title={formatPrice(post.price)}>
            {formatCompactPrice(post.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const homeData = await getHomeData();
  const hasPosts = Boolean(homeData?.featuredPosts.length);
  const popularLocations = homeData?.popularLocations ?? [];

  const stats = [
    {
      icon: Sparkles,
      value: formatCompactNumber(homeData?.stats.sellPostCount ?? 0),
      label: "Bất động sản đang bán",
      color: "theme-public-icon-blue",
    },
    {
      icon: Home,
      value: formatCompactNumber(homeData?.stats.rentPostCount ?? 0),
      label: "Bất động sản cho thuê",
      color: "theme-public-icon-violet",
    },
    {
      icon: Building2,
      value: formatCompactNumber(homeData?.stats.activePostCount ?? 0),
      label: "Tin đang hoạt động",
      color: "theme-public-icon-green",
    },
    {
      icon: UsersRound,
      value: formatCompactNumber(homeData?.stats.userCount ?? 0),
      label: "Người dùng trong hệ thống",
      color: "theme-public-icon-orange",
    },
  ];

  return (
    <div className="pb-14">
      <section className="relative min-h-[480px] lg:min-h-[560px] overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 z-0">
          <HeroSlideshow />
        </div>

        <div className="theme-hero-overlay absolute inset-0 z-10" />
        <div className="theme-hero-accent absolute inset-0 z-10" />

        <div className={`${sectionContainerClass} relative z-20 flex min-h-[480px] flex-col py-8 lg:min-h-[560px] lg:py-10`}>
          <div className="max-w-2xl">
            <div className="theme-hero-badge mb-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--accent)] backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              {"Nền tảng bất động sản TrustEstate"}
            </div>

            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[56px]">
              {"Tìm kiếm bất động sản "}
              <span className="text-[var(--accent)]">{"phù hợp"}</span>
              {" với bạn"}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--secondary-foreground)] sm:text-base sm:leading-8">
              Hệ sinh thái với hơn 100,000+ bất động sản được xác thực. Khám phá ngay không gian sống mơ ước và cơ hội đầu tư an toàn cùng TrustEstate.
            </p>
          </div>

          <div className="mt-4 mb-12 lg:mb-4 lg:mt-auto">
            <HomeSearchForm popularLocations={popularLocations} />
          </div>
        </div>
      </section>

      <section className={`${sectionContainerClass} relative z-10 -mt-8`}>
        <div className="theme-card flex overflow-x-auto snap-x snap-mandatory gap-3 rounded-2xl p-4 backdrop-blur-xl sm:grid sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-[140px] shrink-0 snap-start flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-1 sm:px-2 py-2 text-center sm:text-left sm:min-w-0 sm:shrink">
              <span className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full ${stat.color} text-white shadow-lg`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>

              <span>
                <span className="block text-xl sm:text-2xl font-bold text-[var(--foreground)]">{stat.value}</span>
                <span className="text-[11px] leading-tight sm:text-sm text-[var(--secondary-foreground)]">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionContainerClass} mt-6 sm:mt-8`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {"Bất động sản mới nhất"}
          </h2>

          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
          >
            {"Xem tất cả"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {hasPosts ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {homeData?.featuredPosts.map((post, index) => {
              let visibilityClass = "block";
              if (index === 3) {
                visibilityClass = "block lg:hidden xl:block";
              } else if (index === 4) {
                visibilityClass = "hidden 2xl:block";
              }

              return (
                <div key={post.id} className={visibilityClass}>
                  <PropertyCard post={post} index={index} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card theme-text-secondary flex min-h-40 items-center justify-center p-8 text-center">
            {"Chưa có bài đăng đang hoạt động để hiển thị."}
          </div>
        )}
      </section>

      {homeData && homeData.categories.length > 0 && (
        <section className={`${sectionContainerClass} mt-6 sm:mt-9`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              {"Khám phá theo loại hình"}
            </h2>

            <Link
              href="/posts"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
            >
              {"Xem tất cả"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {homeData.categories.map((category) => {
              const Icon = propertyIcons[category.propertyType];

              return (
                <Link
                  key={category.propertyType}
                  href={`/posts?propertyType=${category.propertyType}`}
                  className="glass-card flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-2 sm:gap-4 p-3 sm:p-5 text-center sm:text-left transition hover:border-[var(--info-border)] hover:bg-[var(--hover)]"
                >
                  <span
                    className={`flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl border ${
                      categoryColors[category.propertyType]
                    }`}
                  >
                    <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                  </span>

                  <span>
                    <span className="block text-sm sm:text-base font-semibold text-[var(--foreground)]">{category.label}</span>
                    <span className="theme-text-muted mt-0.5 sm:mt-1 block text-xs sm:text-sm">
                      {formatCompactNumber(category.count)} tin
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes kenburns {
              0% {
                transform: scale(1.05) translate(0, 0);
              }
              50% {
                transform: scale(1.15) translate(-1%, -0.5%);
              }
              100% {
                transform: scale(1.05) translate(0, 0);
              }
            }
          `,
        }}
      />
    </div>
  );
}
