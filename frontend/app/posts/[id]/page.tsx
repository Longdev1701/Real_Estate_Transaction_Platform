"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Expand,
  Heart,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  POST_TYPES,
  PROPERTY_TYPES,
  formatArea,
  formatLocation,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
  type PostType,
  type PropertyType,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";

type EditFormState = {
  title: string;
  description: string;
  price: string;
  area: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  latitude: string;
  longitude: string;
  postType: PostType;
  propertyType: PropertyType;
};

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='52'>TrustEstate</text></svg>";

const savedKey = "trustestate-saved-posts";

const buildEditState = (post: Post): EditFormState => ({
  title: post.title,
  description: post.description,
  price: String(post.price),
  area: String(post.area),
  address: post.address,
  city: post.city,
  district: post.district,
  ward: post.ward ?? "",
  latitude: String(post.latitude),
  longitude: String(post.longitude),
  postType: post.postType,
  propertyType: post.propertyType,
});

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  useEffect(() => {
    const rawValue = window.localStorage.getItem(savedKey);
    const savedPosts = rawValue ? (JSON.parse(rawValue) as string[]) : [];
    setIsSaved(savedPosts.includes(params.id));
  }, [params.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<{ data: Post }>(`/posts/${params.id}`);

        if (!isMounted) {
          return;
        }

        const currentPost = response.data.data;
        setPost(currentPost);
        setEditForm(buildEditState(currentPost));
        setSelectedImage(0);

        const relatedResponse = await api.get<{ data: { items: Post[] } }>(
          `/posts?city=${encodeURIComponent(currentPost.city)}&propertyType=${currentPost.propertyType}&limit=3`,
        );

        if (!isMounted) {
          return;
        }

        setRelatedPosts(
          relatedResponse.data.data.items.filter((item) => item.id !== currentPost.id).slice(0, 3),
        );
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Khong the tai chi tiet bai dang.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const canManagePost = useMemo(() => {
    if (!user || !post) {
      return false;
    }

    return user.role === "ADMIN" || user.id === post.author.id;
  }, [post, user]);

  const images = useMemo(() => {
    if (!post) {
      return [];
    }

    return post.images.length > 0 ? post.images : [{ id: "fallback", imageUrl: imageFallback, order: 0 }];
  }, [post]);

  const activeImage = images[selectedImage]?.imageUrl ?? imageFallback;

  const handleSaveToggle = () => {
    const rawValue = window.localStorage.getItem(savedKey);
    const savedPosts = rawValue ? (JSON.parse(rawValue) as string[]) : [];
    const nextSavedPosts = isSaved
      ? savedPosts.filter((postId) => postId !== params.id)
      : Array.from(new Set([...savedPosts, params.id]));

    window.localStorage.setItem(savedKey, JSON.stringify(nextSavedPosts));
    setIsSaved(!isSaved);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        title: editForm.title,
        description: editForm.description,
        price: Number(editForm.price),
        area: Number(editForm.area),
        address: editForm.address,
        city: editForm.city,
        district: editForm.district,
        ward: editForm.ward || undefined,
        latitude: Number(editForm.latitude),
        longitude: Number(editForm.longitude),
        postType: editForm.postType,
        propertyType: editForm.propertyType,
      };

      const response = await api.patch<{ data: Post }>(`/posts/${params.id}`, payload);
      setPost(response.data.data);
      setEditForm(buildEditState(response.data.data));
      setIsEditing(false);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Cap nhat bai dang that bai.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xoa bai dang nay?")) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/posts/${params.id}`);
      router.push("/posts");
      router.refresh();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Khong the xoa bai dang.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10 lg:px-8">
        <div className="inline-flex items-center gap-3 text-gray-300">
          <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
          Dang tai chi tiet bai dang...
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="container mx-auto px-4 py-10 lg:px-8">
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-red-200">{error}</p>
          <button type="button" onClick={() => router.push("/posts")} className="btn-primary mt-6">
            Quay lai danh sach
          </button>
        </div>
      </div>
    );
  }

  if (!post || !editForm) {
    return null;
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition hover:text-white">
          Trang chu
        </Link>
        <span>/</span>
        <Link href="/posts" className="transition hover:text-white">
          Bai dang
        </Link>
        <span>/</span>
        <span className="text-white">{post.title}</span>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 min-w-0">
          <div className="glass-card overflow-hidden p-0">
            <div className="grid gap-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
              <div className="relative overflow-hidden">
                <img
                  src={activeImage}
                  alt={post.title}
                  className="aspect-[16/10] w-full object-cover lg:aspect-[16/9]"
                  onError={(event) => {
                    event.currentTarget.src = imageFallback;
                  }}
                />
                <div className="absolute left-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {postTypeLabels[post.postType]}
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <div className="rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white">
                    Anh ({images.length})
                  </div>
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1))}
                      className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-white transition hover:bg-slate-900"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage((current) => (current === images.length - 1 ? 0 : current + 1))}
                      className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-white transition hover:bg-slate-900"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1 bg-slate-950/20 p-1">
                {images.slice(0, 4).map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    <img
                      src={image.imageUrl}
                      alt={post.title}
                      className="aspect-[4/3] w-full object-cover transition hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.src = imageFallback;
                      }}
                    />
                    {index === 3 && images.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 text-3xl font-semibold text-white">
                        +{images.length - 4}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-white">{post.title}</h1>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                    <BadgeCheck className="h-4 w-4" />
                    Da xac thuc
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-300" />
                    {formatLocation(post)}
                  </span>
                  <span className="text-blue-300">Xem tren ban do</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveToggle}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10"
                >
                  <Heart className={`h-4 w-4 ${isSaved ? "fill-blue-400 text-blue-400" : "text-blue-300"}`} />
                  {isSaved ? "Da luu" : "Luu"}
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10">
                  <Building2 className="h-4 w-4 text-blue-300" />
                  So sanh
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10">
                  <Share2 className="h-4 w-4 text-blue-300" />
                  Chia se
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-b border-white/10 pb-6 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-4xl font-semibold text-blue-300">{formatPrice(post.price)}</p>
                <p className="mt-1 text-sm text-gray-400">Gia dang tin</p>
              </div>
              <div>
                <p className="inline-flex items-center gap-2 text-2xl font-semibold text-white">
                  <Expand className="h-5 w-5 text-blue-300" />
                  {formatArea(post.area)}
                </p>
                <p className="mt-1 text-sm text-gray-400">Dien tich</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{propertyTypeLabels[post.propertyType]}</p>
                <p className="mt-1 text-sm text-gray-400">Loai hinh</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{postTypeLabels[post.postType]}</p>
                <p className="mt-1 text-sm text-gray-400">Loai tin</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{post.city}</p>
                <p className="mt-1 text-sm text-gray-400">Khu vuc</p>
              </div>
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <h2 className="text-2xl font-semibold text-white">Mo ta chi tiet</h2>
                <p className="mt-4 whitespace-pre-line leading-8 text-gray-300">{post.description}</p>
              </div>

              <div className="border-t border-white/10 pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <h2 className="text-2xl font-semibold text-white">Thong tin chi tiet</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-gray-400">Ma tin</dt>
                    <dd className="mt-1 font-medium text-white">{post.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-400">Nguoi dang</dt>
                    <dd className="mt-1 font-medium text-white">{post.author.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-400">Dia chi</dt>
                    <dd className="mt-1 font-medium text-white">{post.address}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-400">Quan / huyen</dt>
                    <dd className="mt-1 font-medium text-white">{post.district}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-400">Tinh / thanh</dt>
                    <dd className="mt-1 font-medium text-white">{post.city}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-400">Trang thai</dt>
                    <dd className="mt-1 font-medium text-white">{post.status}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden p-0">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-2xl font-semibold text-white">Vi tri tren ban do</h2>
            </div>
            <iframe
              title={`Ban do ${post.title}`}
              src={`https://maps.google.com/maps?q=${post.latitude},${post.longitude}&z=15&output=embed`}
              className="h-[360px] w-full border-0"
              loading="lazy"
            />
          </div>

          {canManagePost && isEditing && (
            <form onSubmit={handleEditSubmit} className="glass-card space-y-4 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Cap nhat bai dang</h2>
                  <p className="text-sm text-gray-400">Chinh sua thong tin chinh cua bai dang hien tai.</p>
                </div>
              </div>

              <input className="input-dark" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} placeholder="Tieu de" />
              <textarea className="input-dark min-h-32" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} placeholder="Mo ta" />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="input-dark" type="number" min="0" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} placeholder="Gia" />
                <input className="input-dark" type="number" min="0" value={editForm.area} onChange={(event) => setEditForm({ ...editForm, area: event.target.value })} placeholder="Dien tich" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select className="input-dark" value={editForm.postType} onChange={(event) => setEditForm({ ...editForm, postType: event.target.value as PostType })}>
                  {POST_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {postTypeLabels[value]}
                    </option>
                  ))}
                </select>
                <select className="input-dark" value={editForm.propertyType} onChange={(event) => setEditForm({ ...editForm, propertyType: event.target.value as PropertyType })}>
                  {PROPERTY_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {propertyTypeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              <input className="input-dark" value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} placeholder="Dia chi" />
              <div className="grid gap-4 md:grid-cols-3">
                <input className="input-dark" value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} placeholder="Tinh / thanh" />
                <input className="input-dark" value={editForm.district} onChange={(event) => setEditForm({ ...editForm, district: event.target.value })} placeholder="Quan / huyen" />
                <input className="input-dark" value={editForm.ward} onChange={(event) => setEditForm({ ...editForm, ward: event.target.value })} placeholder="Phuong / xa" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="input-dark" type="number" step="any" value={editForm.latitude} onChange={(event) => setEditForm({ ...editForm, latitude: event.target.value })} placeholder="Vi do" />
                <input className="input-dark" type="number" step="any" value={editForm.longitude} onChange={(event) => setEditForm({ ...editForm, longitude: event.target.value })} placeholder="Kinh do" />
              </div>

              <button type="submit" disabled={isSaving} className="btn-primary inline-flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "Dang luu..." : "Luu thay doi"}
              </button>
            </form>
          )}
        </section>

        <aside className="space-y-5">
          <div className="2xl:sticky 2xl:top-24 2xl:space-y-5">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-semibold text-white">Lien he voi nguoi dang</h2>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-xl font-semibold text-blue-200">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                  ) : (
                    post.author.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-semibold text-white">{post.author.fullName}</p>
                    <BadgeCheck className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="mt-1 text-gray-400">{post.author.email}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href={post.author.phone ? `tel:${post.author.phone}` : `mailto:${post.author.email}`}
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3"
                >
                  <MessageCircle className="h-4 w-4" />
                  Nhan tin
                </a>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href={post.author.phone ? `tel:${post.author.phone}` : `mailto:${post.author.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-100 transition hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                    Goi dien
                  </a>
                  <a
                    href={`mailto:${post.author.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-100 transition hover:bg-white/10"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Giao dich an toan</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>Khong chuyen khoan truoc khi xem nha.</li>
                  <li>Kiem tra giay to va thong tin nguoi dang.</li>
                  <li>Lien he truc tiep qua kenh chinh thong.</li>
                </ul>
              </div>

              {canManagePost && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-100 transition hover:bg-white/10"
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    {isEditing ? "Dong sua" : "Chinh sua"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Dang xoa..." : "Xoa bai"}
                  </button>
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h2 className="text-2xl font-semibold text-white">Dac diem noi bat</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Gia dang tin {formatPrice(post.price)} cho {formatArea(post.area)}.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Thuoc nhom {propertyTypeLabels[post.propertyType].toLowerCase()} tai {post.district}.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Dang tin theo hinh thuc {postTypeLabels[post.postType].toLowerCase()}.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Vi tri: {post.address}.
                </li>
              </ul>
            </div>

            <div className="glass-card p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">Bat dong san tuong tu</h2>
                <Link href="/posts" className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
                  Xem tat ca
                </Link>
              </div>

              <div className="space-y-4">
                {relatedPosts.length === 0 ? (
                  <p className="text-sm text-gray-400">Chua co bai dang tuong tu.</p>
                ) : (
                  relatedPosts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/posts/${item.id}`}
                      className="flex gap-3 rounded-2xl border border-transparent p-1 transition hover:border-white/10 hover:bg-white/5"
                    >
                      <img
                        src={item.images[0]?.imageUrl || imageFallback}
                        alt={item.title}
                        className="h-24 w-28 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-400">{formatLocation(item)}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-blue-300">{formatPrice(item.price)}</span>
                          <span className="text-sm text-gray-400">{formatArea(item.area)}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/posts")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
