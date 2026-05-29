export const POST_TYPES = ["SELL", "RENT", "FIND"] as const;
export const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "LAND", "ROOM"] as const;

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
  isSaved?: boolean;
  relatedPosts?: Post[];
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

export const postTypeLabels: Record<PostType, string> = {
  SELL: "B\u00e1n",
  RENT: "Cho thu\u00ea",
  FIND: "C\u1ea7n t\u00ecm",
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  HOUSE: "Nh\u00e0",
  APARTMENT: "C\u0103n h\u1ed9",
  LAND: "\u0110\u1ea5t",
  ROOM: "Ph\u00f2ng",
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);

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
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  Object.entries(filter).forEach(([key, rawValue]) => {
    const value = rawValue.trim();
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
};
