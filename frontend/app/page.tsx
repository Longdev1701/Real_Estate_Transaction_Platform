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
  APARTMENT: "text-blue-300 bg-blue-500/10 border-blue-400/30",
  HOUSE: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  LAND: "text-lime-300 bg-lime-500/10 border-lime-400/30",
  ROOM: "text-violet-300 bg-violet-500/10 border-violet-400/30",
  VILLA: "text-rose-300 bg-rose-500/10 border-rose-400/30",
  OFFICE: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
  SHOPHOUSE: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  WAREHOUSE: "text-slate-300 bg-slate-500/10 border-slate-400/30",
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
    <label className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 transition focus-within:border-blue-400/40 hover:bg-white/10">
      <Icon className="h-5 w-5 shrink-0 text-gray-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-gray-400">{label}</span>
        <select name={name} className="hero-select mt-1 w-full bg-transparent text-sm font-medium text-white outline-none">
          {children}
        </select>
      </span>
    </label>
  );
}

function PropertyCard({ post, index }: { post: Post; index: number }) {
  const tag = index === 0 ? "M\u1edbi" : index === 1 ? "Hot" : "";
  const tagClass = index === 0 ? "bg-emerald-500" : "bg-rose-500";

  return (
    <Link href={`/posts/${post.id}`} className="glass-card group overflow-hidden transition hover:border-blue-400/40 hover:bg-white/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getPrimaryImage(post)}
          alt={post.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {tag && (
          <span className={`absolute left-3 top-3 rounded-lg px-3 py-1 text-xs font-bold uppercase text-white ${tagClass}`}>
            {tag}
          </span>
        )}
        <div className="absolute right-3 top-3 z-10">
          <CompareButton post={post} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-12 font-semibold text-white">{post.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatLocation(post)}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">{postTypeLabels[post.postType]}</span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">{propertyTypeLabels[post.propertyType]}</span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
            <Ruler className="h-3.5 w-3.5" />
            {formatArea(post.area)}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="text-2xl font-bold text-blue-400">{formatPrice(post.price)}</span>
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
      color: "bg-blue-600",
    },
    {
      icon: Home,
      value: formatCompactNumber(homeData?.stats.rentPostCount ?? 0),
      label: "B\u1ea5t \u0111\u1ed9ng s\u1ea3n cho thu\u00ea",
      color: "bg-violet-600",
    },
    {
      icon: Building2,
      value: formatCompactNumber(homeData?.stats.activePostCount ?? 0),
      label: "Tin \u0111ang ho\u1ea1t \u0111\u1ed9ng",
      color: "bg-emerald-600",
    },
    {
      icon: UsersRound,
      value: formatCompactNumber(homeData?.stats.userCount ?? 0),
      label: "Ng\u01b0\u1eddi d\u00f9ng trong h\u1ec7 th\u1ed1ng",
      color: "bg-orange-600",
    },
  ];

  return (
    <div className="pb-14">
      <section className="relative min-h-[560px] overflow-hidden border-b border-blue-500/20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})`, animation: "kenburns 40s ease-in-out infinite" }} />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ animation: "kenburns 40s ease-in-out infinite" }}
          poster={heroImage}
        >
          <source src="https://player.vimeo.com/external/434045526.sd.mp4?s=c27d2ab2d0d3d0f04e1302d96c77a3d3c8c6913e&profile_id=165&oauth2_token_id=57447761" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.82)_42%,rgba(2,6,23,0.48)_78%,rgba(2,6,23,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(37,99,235,0.34),transparent_36%),radial-gradient(circle_at_76%_18%,rgba(14,165,233,0.18),transparent_32%)]" />

        <div className={`${sectionContainerClass} relative py-8 lg:py-10`}>
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-blue-100 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              {"N\u1ec1n t\u1ea3ng b\u1ea5t \u0111\u1ed9ng s\u1ea3n TrustEstate"}
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[56px]">
              {"T\u00ecm ki\u1ebfm b\u1ea5t \u0111\u1ed9ng s\u1ea3n "}
              <span className="text-blue-400">{"ph\u00f9 h\u1ee3p"}</span>
              {" v\u1edbi b\u1ea1n"}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
              {"Kh\u00e1m ph\u00e1 b\u1ea5t \u0111\u1ed9ng s\u1ea3n \u0111ang ho\u1ea1t \u0111\u1ed9ng trong h\u1ec7 th\u1ed1ng, l\u1ecdc theo nhu c\u1ea7u v\u00e0 xem chi ti\u1ebft t\u1eeb d\u1eef li\u1ec7u th\u1eadt."}
            </p>
          </div>

          <form action="/posts" className="mt-7 w-full max-w-[1360px] rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr_1fr_auto]">
              <label className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 transition hover:bg-white/10">
                <MapPin className="h-5 w-5 shrink-0 text-gray-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-gray-400">{"V\u1ecb tr\u00ed"}</span>
                  <input name="city" className="mt-1 w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-gray-300" placeholder={"Nh\u1eadp t\u1ec9nh / th\u00e0nh ph\u1ed1"} />
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
                <span className="text-gray-300">{"T\u00ecm ki\u1ebfm ph\u1ed5 bi\u1ebfn:"}</span>
                {popularLocations.map((item) => (
                  <Link key={item.city} href={`/posts?city=${encodeURIComponent(item.city)}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-gray-200 transition hover:bg-white/10">
                    {item.city}
                  </Link>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className={`${sectionContainerClass} relative z-10 -mt-8`}>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-blue-950/20 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 px-2 py-2">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${stat.color} text-white shadow-lg`}>
                <stat.icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-gray-300">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionContainerClass} mt-8`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{"B\u1ea5t \u0111\u1ed9ng s\u1ea3n m\u1edbi nh\u1ea5t"}</h2>
          <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200">
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
          <div className="glass-card flex min-h-40 items-center justify-center p-8 text-center text-gray-300">
            {"Ch\u01b0a c\u00f3 b\u00e0i \u0111\u0103ng \u0111ang ho\u1ea1t \u0111\u1ed9ng \u0111\u1ec3 hi\u1ec3n th\u1ecb."}
          </div>
        )}
      </section>

      {homeData && homeData.categories.length > 0 && (
        <section className={`${sectionContainerClass} mt-9`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{"Kh\u00e1m ph\u00e1 theo lo\u1ea1i h\u00ecnh"}</h2>
            <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200">
              {"Xem t\u1ea5t c\u1ea3"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {homeData.categories.map((category) => {
              const Icon = propertyIcons[category.propertyType];
              return (
                <Link key={category.propertyType} href={`/posts?propertyType=${category.propertyType}`} className="glass-card flex items-center gap-4 p-5 transition hover:border-blue-400/40 hover:bg-white/10">
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${categoryColors[category.propertyType]}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <span>
                    <span className="block font-semibold text-white">{category.label}</span>
                    <span className="mt-1 block text-sm text-gray-400">{formatCompactNumber(category.count)} tin</span>
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
            .hero-select {
              color-scheme: dark;
            }

            .hero-select option {
              background-color: #0b1120;
              color: #ffffff;
            }

            .hero-select option:checked {
              background-color: #1d4ed8;
              color: #ffffff;
            }

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
