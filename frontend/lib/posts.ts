export const POST_TYPES = ["SELL", "RENT"] as const;
export const PROPERTY_TYPES = [
  "APARTMENT",
  "HOUSE",
  "LAND",
  "ROOM",
  "VILLA",
  "OFFICE",
  "SHOPHOUSE",
  "WAREHOUSE",
] as const;

export type PostType = (typeof POST_TYPES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type PostImage = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  order: number;
};

export type PostAuthor = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type PostBanContext = {
  reportId: string;
  reason: string;
  description?: string | null;
  resolvedAt?: string | null;
  appealStatus: "NONE" | "PENDING" | "REVIEWED";
  appealMessage?: string | null;
  appealEvidence?: string | null;
  appealedAt?: string | null;
};

export type Post = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  price: number;
  area: number;
  address: string;
  city: string;
  district: string;
  ward?: string | null;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  postType: PostType;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  images: PostImage[];
  imageCount?: number;
  commentCount?: number;
  isSaved?: boolean;
  relatedPosts?: Post[];
  banContext?: PostBanContext | null;
  features: {
    id: string;
    name: string;
    icon: string | null;
    category?: string | null;
  }[];
};

export type SavedPost = {
  id: string;
  createdAt: string;
  postId: string;
  userId: string;
  isSaved: boolean;
  post: Post;
};

export type PostFilterValue = {
  keyword: string;
  authorId?: string;
  city: string;
  district: string;
  postType: "" | PostType;
  propertyType: "" | PropertyType;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  featureIds: string;
};

export type PostListData = {
  items: Post[];
  meta: {
    page: number;
    limit: number;
    total: number | null;
    totalPages: number | null;
    hasMore: boolean;
  };
};

export const defaultPostFilter: PostFilterValue = {
  keyword: "",
  city: "",
  district: "",
  postType: "",
  propertyType: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  featureIds: "",
};

const normalizeNumericRange = (
  minValue: string,
  maxValue: string,
): [string, string] => {
  if (!minValue || !maxValue) {
    return [minValue, maxValue];
  }

  const minNumber = Number(minValue);
  const maxNumber = Number(maxValue);

  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber) || minNumber <= maxNumber) {
    return [minValue, maxValue];
  }

  return [maxValue, minValue];
};

export const normalizePostFilter = (filter: PostFilterValue): PostFilterValue => {
  const [minPrice, maxPrice] = normalizeNumericRange(filter.minPrice, filter.maxPrice);
  const [minArea, maxArea] = normalizeNumericRange(filter.minArea, filter.maxArea);

  return {
    ...filter,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
  };
};

export const postTypeLabels: Record<PostType, string> = {
  SELL: "Bán",
  RENT: "Cho thuê",
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "Căn hộ",
  HOUSE: "Nhà riêng",
  LAND: "Đất",
  ROOM: "Phòng trọ",
  VILLA: "Biệt thự",
  OFFICE: "Văn phòng",
  SHOPHOUSE: "Shophouse / Mặt bằng kinh doanh",
  WAREHOUSE: "Kho / Xưởng",
};

export const statusLabels: Record<string, string> = {
  ACTIVE: "Đang hiển thị",
  INACTIVE: "Đã ẩn",
  BANNED: "Bị khóa",
  PENDING: "Chờ duyệt",
  SOLD: "Đã bán/cho thuê",
  DRAFT: "Bản nháp",
  REJECTED: "Từ chối",
};

export const statusColors: Record<string, string> = {
  ACTIVE: "theme-badge-success",
  INACTIVE: "theme-button-secondary",
  BANNED: "theme-badge-danger",
  PENDING: "theme-badge-warning",
  SOLD: "theme-badge-info",
  DRAFT: "theme-subtle-card text-[var(--muted-foreground)]",
  REJECTED: "theme-badge-danger",
};

export const formatPrice = (price: number) => {
  const formattedNumber = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedNumber} ₫`;
};

export const formatArea = (area: number) =>
  `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: area % 1 === 0 ? 0 : 1,
  }).format(area)} m\u00b2`;

export const formatLocation = (post: Pick<Post, "ward" | "district" | "city">) =>
  [post.ward, post.district, post.city].filter(Boolean).join(", ");

export const getPrimaryImage = (post: Pick<Post, "images">) =>
  post.images[0]?.imageUrl ??
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

export const buildPostQuery = (
  filter: PostFilterValue,
  page: number,
  limit: number,
) => {
  const normalizedFilter = normalizePostFilter(filter);
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  Object.entries(normalizedFilter).forEach(([key, rawValue]) => {
    if (rawValue !== undefined && rawValue !== null) {
      const value = String(rawValue).trim();
      if (value) {
        params.set(key, value);
      }
    }
  });

  return params.toString();
};
