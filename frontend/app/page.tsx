import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Home,
  Landmark,
  LandPlot,
  MapPin,
  Ruler,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { getHomeData } from "@/lib/home";
import {
  formatArea,
  formatLocation,
  formatPrice,
  getPrimaryImage,
  postTypeLabels,
  PROPERTY_TYPES,
  propertyTypeLabels,
  type Post,
  type PropertyType,
} from "@/lib/posts";

import { CompareButton } from "@/components/post/CompareButton";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { CitySelect } from "@/components/home/CitySelect";

const heroImage =
  "https://images.pexels.com/photos/313782/pexels-photo-313782.jpeg?auto=compress&cs=tinysrgb&w=2400";

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

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

function SelectField({
  icon: Icon,
  label,
  name,
  children,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="theme-hero-field flex min-h-16 items-center gap-3 rounded-xl px-4 transition focus-within:border-[var(--info-border)] hover:bg-[var(--hover)]">
      <Icon className="h-5 w-5 shrink-0 text-[var(--accent)]" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-[var(--muted)]">{label}</span>
        <select name={name} className="hero-select mt-1 w-full bg-transparent text-sm font-medium text-[var(--foreground)] outline-none">
          {children}
        </select>
      </span>
    </label>
  );
}

function PropertyCard({ post, index }: { post: Post; index: number }) {
  const tag = index === 0 ? "M\u1edbi" : index === 1 ? "Hot" : "";
  const tagClass = index === 0 ? "theme-button-success" : "theme-button-danger-solid";

  return (
    <Link href={`/posts/${post.id}`} className="glass-card group overflow-hidden transition hover:border-[var(--accent-border)] hover:bg-[var(--hover)]">
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
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-12 font-semibold text-[var(--foreground)]">{post.title}</h3>
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
        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="text-2xl font-bold text-[var(--accent)]">{formatPrice(post.price)}</span>
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
      label: "B\u1ea5t \u0111\u1ed9ng s\u1ea3n \u0111ang b\u00e1n",
      color: "theme-admin-icon-blue",
    },
    {
      icon: Home,
      value: formatCompactNumber(homeData?.stats.rentPostCount ?? 0),
      label: "B\u1ea5t \u0111\u1ed9ng s\u1ea3n cho thu\u00ea",
      color: "theme-admin-icon-violet",
    },
    {
      icon: Building2,
      value: formatCompactNumber(homeData?.stats.activePostCount ?? 0),
      label: "Tin \u0111ang ho\u1ea1t \u0111\u1ed9ng",
      color: "theme-admin-icon-green",
    },
    {
      icon: UsersRound,
      value: formatCompactNumber(homeData?.stats.userCount ?? 0),
      label: "Ng\u01b0\u1eddi d\u00f9ng trong h\u1ec7 th\u1ed1ng",
      color: "theme-admin-icon-orange",
    },
  ];

  return (
    <div className="pb-14">
      <section className="relative min-h-[560px] overflow-hidden border-b border-blue-500/20">
        <div className="absolute inset-0 z-0">
          <HeroSlideshow />
        </div>
        <div className="theme-hero-overlay absolute inset-0 z-10" />
        <div className="theme-hero-accent absolute inset-0 z-10" />

        <div className={`${sectionContainerClass} relative z-20 py-8 lg:py-10`}>
          <div className="max-w-2xl">
            <div className="theme-hero-badge mb-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--accent)] backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              {"N\u1ec1n t\u1ea3ng b\u1ea5t \u0111\u1ed9ng s\u1ea3n TrustEstate"}
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-[56px]">
              {"T\u00ecm ki\u1ebfm b\u1ea5t \u0111\u1ed9ng s\u1ea3n "}
              <span className="text-[var(--accent)]">{"ph\u00f9 h\u1ee3p"}</span>
              {" v\u1edbi b\u1ea1n"}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--secondary-foreground)] sm:text-lg">
              {"Kh\u00e1m ph\u00e1 b\u1ea5t \u0111\u1ed9ng s\u1ea3n \u0111ang ho\u1ea1t \u0111\u1ed9ng trong h\u1ec7 th\u1ed1ng, l\u1ecdc theo nhu c\u1ea7u v\u00e0 xem chi ti\u1ebft t\u1eeb d\u1eef li\u1ec7u th\u1eadt."}
            </p>
          </div>

          <form action="/posts" className="theme-hero-search mt-7 w-full max-w-[1360px] rounded-2xl p-4 shadow-2xl shadow-blue-950/30">
            <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr_1fr_auto]">
              <label className="theme-hero-field flex min-h-16 items-center gap-3 rounded-xl px-4 transition hover:bg-[var(--hover)]">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-[var(--muted)]">{"V\u1ecb tr\u00ed"}</span>
                  <CitySelect />
                </span>
              </label>

              <SelectField icon={Home} label={"Lo\u1ea1i b\u1ea5t \u0111\u1ed9ng s\u1ea3n"} name="propertyType">
                <option value="">{"Ch\u1ecdn lo\u1ea1i"}</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {propertyTypeLabels[type]}
                  </option>
                ))}
              </SelectField>

              <SelectField icon={SlidersHorizontal} label={"Kho\u1ea3ng gi\u00e1"} name="maxPrice">
                <option value="">{"Ch\u1ecdn kho\u1ea3ng gi\u00e1"}</option>
                <option value="1000000000">{"D\u01b0\u1edbi 1 t\u1ef7"}</option>
                <option value="3000000000">{"D\u01b0\u1edbi 3 t\u1ef7"}</option>
                <option value="5000000000">{"D\u01b0\u1edbi 5 t\u1ef7"}</option>
                <option value="10000000000">{"D\u01b0\u1edbi 10 t\u1ef7"}</option>
              </SelectField>

              <SelectField icon={Ruler} label={"Di\u1ec7n t\u00edch"} name="minArea">
                <option value="">{"Ch\u1ecdn di\u1ec7n t\u00edch"}</option>
                <option value="30">{"T\u1eeb 30 m\u00b2"}</option>
                <option value="50">{"T\u1eeb 50 m\u00b2"}</option>
                <option value="80">{"T\u1eeb 80 m\u00b2"}</option>
                <option value="120">{"T\u1eeb 120 m\u00b2"}</option>
              </SelectField>

              <button type="submit" className="btn-primary inline-flex min-h-16 items-center justify-center gap-2 rounded-xl px-8">
                <Search className="h-5 w-5" />
                {"T\u00ecm ki\u1ebfm"}
              </button>
            </div>

            {popularLocations.length > 0 && (
              <div className="mt-5 flex max-h-20 flex-wrap items-center gap-3 overflow-hidden text-sm">
                <span className="text-[var(--secondary-foreground)]">{"T\u00ecm ki\u1ebfm ph\u1ed5 bi\u1ebfn:"}</span>
                {popularLocations.map((item) => (
                  <Link key={item.city} href={`/posts?city=${encodeURIComponent(item.city)}`} className="theme-button-secondary rounded-full px-4 py-1.5 text-sm transition">
                    {item.city}
                  </Link>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className={`${sectionContainerClass} relative z-10 -mt-8`}>
        <div className="theme-card grid gap-4 rounded-2xl p-5 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 px-2 py-2">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${stat.color} text-white shadow-lg`}>
                <stat.icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-2xl font-bold text-[var(--foreground)]">{stat.value}</span>
                <span className="text-sm text-[var(--secondary-foreground)]">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionContainerClass} mt-8`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{"B\u1ea5t \u0111\u1ed9ng s\u1ea3n m\u1edbi nh\u1ea5t"}</h2>
          <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]">
            {"Xem t\u1ea5t c\u1ea3"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {hasPosts ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {homeData?.featuredPosts.map((post, index) => (
              <PropertyCard key={post.id} post={post} index={index} />
            ))}
          </div>
        ) : (
          <div className="glass-card theme-text-secondary flex min-h-40 items-center justify-center p-8 text-center">
            {"Ch\u01b0a c\u00f3 b\u00e0i \u0111\u0103ng \u0111ang ho\u1ea1t \u0111\u1ed9ng \u0111\u1ec3 hi\u1ec3n th\u1ecb."}
          </div>
        )}
      </section>

      {homeData && homeData.categories.length > 0 && (
        <section className={`${sectionContainerClass} mt-9`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{"Kh\u00e1m ph\u00e1 theo lo\u1ea1i h\u00ecnh"}</h2>
            <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]">
              {"Xem t\u1ea5t c\u1ea3"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {homeData.categories.map((category) => {
              const Icon = propertyIcons[category.propertyType];
              return (
                <Link key={category.propertyType} href={`/posts?propertyType=${category.propertyType}`} className="glass-card flex items-center gap-4 p-5 transition hover:border-[var(--info-border)] hover:bg-[var(--hover)]">
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${categoryColors[category.propertyType]}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <span>
                    <span className="block font-semibold text-white">{category.label}</span>
                    <span className="theme-text-muted mt-1 block text-sm">{formatCompactNumber(category.count)} tin</span>
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
