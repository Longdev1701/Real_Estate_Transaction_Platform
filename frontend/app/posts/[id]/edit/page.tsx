"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Trash2,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  fetchDistrictsByProvinceCode,
  fetchProvinces,
  fetchWardsByDistrictCode,
  findAdministrativeUnitByName,
  type District,
  type Province,
  type Ward,
} from "@/lib/administrative-divisions";
import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { FeatureIcon } from "@/lib/feature-icons";
import { compressPropertyImage } from "@/lib/image-compression";
import {
  acceptedPropertyImageInput,
  extractPostFeatureIds,
  getPropertyImageValidation,
  maxPropertyImageCount,
  type PropertyFeature,
} from "@/lib/post-form";
import {
  POST_TYPES,
  PROPERTY_TYPES,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
  type PostImage,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

const editPostSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải từ 5 ký tự trở lên"),
  description: z.string().min(10, "Mô tả phải từ 10 ký tự trở lên"),
  price: z.coerce.number().positive("Giá phải lớn hơn 0"),
  area: z.coerce.number().positive("Diện tích phải lớn hơn 0"),
  address: z.string().min(3, "Vui lòng nhập địa chỉ cụ thể"),
  city: z.string().min(2, "Vui lòng nhập tỉnh / thành phố"),
  district: z.string().min(2, "Vui lòng nhập quận / huyện"),
  ward: z.string().optional(),
  latitude: z.coerce.number().min(-90, "Vĩ độ không hợp lệ").max(90, "Vĩ độ không hợp lệ"),
  longitude: z.coerce.number().min(-180, "Kinh độ không hợp lệ").max(180, "Kinh độ không hợp lệ"),
  propertyType: z.enum(PROPERTY_TYPES),
  postType: z.enum(POST_TYPES),
});

type EditPostInput = z.input<typeof editPostSchema>;
type EditPostValues = z.output<typeof editPostSchema>;
type NewImagePreview = {
  id: string;
  file: File;
  url: string;
};

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='52'>TrustEstate</text></svg>";

const maxImages = maxPropertyImageCount;

const CreatePostMap = dynamic(() => import("@/components/map/CreatePostMap"), {
  ssr: false,
  loading: () => (
    <div className="theme-post-form-card flex h-full w-full items-center justify-center text-sm text-[var(--muted-foreground)]">
      Đang tải bản đồ...
    </div>
  ),
});

const toDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const buildDefaults = (post: Post): EditPostValues => ({
  title: post.title,
  description: post.description,
  price: post.price,
  area: post.area,
  address: post.address,
  city: post.city,
  district: post.district,
  ward: post.ward ?? "",
  latitude: post.latitude,
  longitude: post.longitude,
  propertyType: post.propertyType,
  postType: post.postType,
});

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newImagesRef = useRef<NewImagePreview[]>([]);
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [newImages, setNewImages] = useState<NewImagePreview[]>([]);
  const addToast = useToastStore((state) => state.addToast);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "success" | "failed">("idle");
  const [isDeletingImageId, setIsDeletingImageId] = useState<string | null>(null);

  // States hành chính
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selProvinceCode, setSelProvinceCode] = useState<string>("");
  const [selDistrictCode, setSelDistrictCode] = useState<string>("");
  const [features, setFeatures] = useState<PropertyFeature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  // States cho đặc trưng bất động sản
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditPostInput, unknown, EditPostValues>({
    resolver: zodResolver(editPostSchema),
  });

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<{ data: Post }>(`/posts/${params.id}`);
        const currentPost = response.data.data;

        if (!isMounted) {
          return;
        }

        if (user && user.id !== currentPost.author.id) {
          addToast("Bạn không có quyền chỉnh sửa bài đăng này.", "error");
          router.replace(`/posts/${params.id}`);
          return;
        }

        setPost(currentPost);
        setImages(currentPost.images);
        setSelectedFeatureIds(extractPostFeatureIds(currentPost));
        reset(buildDefaults(currentPost));
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          addToast(axiosError.response?.data?.message ?? "Không thể tải bài đăng.", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (hasHydrated && user) {
      fetchPost();
    }

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, params.id, reset, user]);

  // Tải danh sách Tỉnh/Thành phố và đồng bộ
  useEffect(() => {
    const initializeAdminData = async () => {
      try {
        const pData = await fetchProvinces();
        setProvinces(pData);

        if (post?.city) {
          const matchProv = findAdministrativeUnitByName(pData, post.city);
          if (matchProv) {
            setSelProvinceCode(String(matchProv.code));

            try {
              const distList = await fetchDistrictsByProvinceCode(matchProv.code);
              setDistricts(distList);

              if (post.district) {
                const matchDist = findAdministrativeUnitByName(distList, post.district);
                if (matchDist) {
                  setSelDistrictCode(String(matchDist.code));
                  setWards(await fetchWardsByDistrictCode(matchDist.code));
                }
              }
            } catch (e) {
              console.error("Lỗi fetch communes:", e);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi tải danh sách tỉnh thành:", err);
      }
    };

    if (post) {
      initializeAdminData();
    }
  }, [post]);

  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  const watchedPrice = watch("price");
  const watchedDescription = watch("description") ?? "";
  const address = watch("address");
  const city = watch("city");
  const district = watch("district");
  const ward = watch("ward");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const watchedPropertyType = watch("propertyType");
  const primaryImage = images[0]?.imageUrl ?? newImages[0]?.url ?? imageFallback;

  useEffect(() => {
    const fetchFeatures = async () => {
      const cacheKey = `features:${watchedPropertyType}`;
      const cached = readSessionCache<PropertyFeature[]>(cacheKey);
      if (cached) {
        setFeatures(cached);
        return;
      }

      try {
        const response = await api.get<{ data: PropertyFeature[] }>(`/features?propertyType=${watchedPropertyType}`);
        setFeatures(response.data.data);
        writeSessionCache(cacheKey, response.data.data, { ttlMs: 30 * 60 * 1000 });
      } catch (err) {
        console.error("Lỗi tải đặc trưng:", err);
      }
    };
    if (watchedPropertyType) {
      fetchFeatures();
    }
  }, [watchedPropertyType]);

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, PropertyFeature[]> = {};
    features.forEach((feature) => {
      const cat = feature.category || "Đặc trưng khác";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(feature);
    });
    return groups;
  }, [features]);
  const totalImageCount = images.length + newImages.length;

  const authorInitial = useMemo(() => {
    const name = post?.author.fullName || user?.fullName || user?.name || "U";
    return name.charAt(0).toUpperCase();
  }, [post?.author.fullName, user?.fullName, user?.name]);

  const handleSelectImages = async (files: FileList | null) => {
    if (!files) {
      return;
    }

    setImageError(null);
    const incomingFiles = Array.from(files);
    const currentImageCount = images.length + newImagesRef.current.length;
    const availableSlots = Math.max(0, maxImages - currentImageCount);
    const selectedFiles = incomingFiles.slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      setImageError(`Mỗi bài đăng chỉ được tối đa ${maxImages} ảnh.`);
      return;
    }

    let processedFiles: Array<{
      file: File;
      validation: ReturnType<typeof getPropertyImageValidation>;
    }>;

    try {
      processedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const originalValidation = getPropertyImageValidation(file);

          if (!originalValidation.isMimeValid && !originalValidation.isExtensionValid) {
            return {
              file,
              validation: originalValidation,
            };
          }

          const compressedFile = await compressPropertyImage(file);
          return {
            file: compressedFile,
            validation: getPropertyImageValidation(compressedFile),
          };
        }),
      );
    } catch (error) {
      console.error("Failed to prepare images before upload:", error);
      setImageError("Không thể xử lý ảnh vừa chọn. Vui lòng thử lại.");
      return;
    }

    setNewImages((current) => [
      ...current,
      ...processedFiles.map(({ file }) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);

    const uploadableCount = processedFiles.filter(({ validation }) => validation.isUploadable).length;
    const invalidTypeCount = processedFiles.filter(({ validation }) => {
      return !validation.isMimeValid && !validation.isExtensionValid;
    }).length;
    const oversizedCount = processedFiles.filter(({ validation }) => !validation.isSizeValid).length;
    const skippedCount = Math.max(0, incomingFiles.length - selectedFiles.length);

    if (uploadableCount === 0) {
      if (oversizedCount > 0 && invalidTypeCount > 0) {
        setImageError("Tất cả ảnh vừa chọn đều vượt quá 5MB hoặc sai định dạng JPG, PNG, WEBP.");
      } else if (oversizedCount > 0) {
        setImageError("Tất cả ảnh vừa chọn đều vượt quá giới hạn 5MB.");
      } else {
        setImageError("Tất cả ảnh vừa chọn đều không đúng định dạng JPG, PNG, WEBP.");
      }
      return;
    }

    if (invalidTypeCount > 0 || oversizedCount > 0 || skippedCount > 0) {
      const messages = [
        invalidTypeCount > 0 ? `${invalidTypeCount} ảnh sai định dạng` : null,
        oversizedCount > 0 ? `${oversizedCount} ảnh vượt 5MB` : null,
        skippedCount > 0 ? `${skippedCount} ảnh vượt giới hạn ${maxImages}` : null,
      ].filter(Boolean);

      setImageError(`Đã thêm ${uploadableCount} ảnh hợp lệ. ${messages.join(", ")}.`);
      return;
    }

    if (selectedFiles.length < incomingFiles.length) {
      setImageError(`Đã thêm ${selectedFiles.length} ảnh. Các ảnh vượt giới hạn ${maxImages} đã bị bỏ qua.`);
    }
  };

  const handleRemoveNewImage = (id: string) => {
    setNewImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }

      return current.filter((image) => image.id !== id);
    });
  };

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelProvinceCode(code);
    setDistricts([]);
    setSelDistrictCode("");
    setWards([]);

    if (code) {
      const name = provinces.find((p) => String(p.code) === code)?.name || "";
      setValue("city", name, { shouldValidate: true });
      try {
        setDistricts(await fetchDistrictsByProvinceCode(code));
      } catch (err) {
        console.error("Lỗi tải danh sách phường xã:", err);
      }
    } else {
      setValue("city", "", { shouldValidate: true });
    }
    setValue("district", "", { shouldValidate: true });
    setValue("ward", "");

    setValue("latitude", 0);
    setValue("longitude", 0);
    setGeocodeStatus("idle");
  };

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelDistrictCode(code);
    setWards([]);

    if (code) {
      const name = districts.find((d) => String(d.code) === code)?.name || "";
      setValue("district", name, { shouldValidate: true });
      // API mới không có phường xã
      setWards(await fetchWardsByDistrictCode(code));
    } else {
      setValue("district", "", { shouldValidate: true });
    }
    setValue("ward", "");

    setValue("latitude", 0);
    setValue("longitude", 0);
  };

  const handleGeocode = async () => {
    if (!city || !district || !address) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeStatus("idle");

    const queries = [
      [address, ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [district, city, "Việt Nam"].filter(Boolean).join(", "),
      [city, "Việt Nam"].filter(Boolean).join(", "),
    ];

    try {
      let found = false;

      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "vi",
            },
          },
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setValue("latitude", parseFloat(data[0].lat), { shouldDirty: true, shouldValidate: true });
          setValue("longitude", parseFloat(data[0].lon), { shouldDirty: true, shouldValidate: true });

          const addr = data[0].address;
          if (addr) {
            const addressParts = [addr.house_number, addr.road].filter(Boolean);
            const detailedAddress = addressParts.length > 0 ? addressParts.join(" ") : null;
            if (detailedAddress) {
              setValue("address", detailedAddress, { shouldValidate: true });
            }
          }

          const displayName = data[0].display_name;
          if (displayName) {
            const nameParts = displayName.split(',').map((s: string) => s.trim());

            const matchProv = provinces.find(p => {
              const baseProv = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
              return nameParts.some((part: string) => part === p.name || part === baseProv || part.includes(p.name) || (baseProv.length > 2 && part.includes(baseProv)));
            });

            if (matchProv) {
              const provCodeStr = String(matchProv.code);
              let currentDistricts = districts;

              if (selProvinceCode !== provCodeStr) {
                setSelProvinceCode(provCodeStr);
                setValue("city", matchProv.name, { shouldValidate: true });
                setSelDistrictCode("");
                setValue("district", "", { shouldValidate: true });
                setValue("ward", "", { shouldValidate: true });
                setWards([]);

                try {
                  const distList = await fetchDistrictsByProvinceCode(provCodeStr);
                  setDistricts(distList);
                  currentDistricts = distList;
                } catch (e) {
                  console.error("Lỗi fetch communes:", e);
                }
              }

              const matchDist = currentDistricts.find(d => {
                const baseDist = d.name.replace(/^(Quận|Huyện|Thị xã|Thành phố)\s+/i, "");
                return nameParts.some((part: string) => part === d.name || part === baseDist || part.includes(d.name) || (baseDist.length > 2 && part.includes(baseDist)));
              });

              if (matchDist) {
                const distCodeStr = String(matchDist.code);

                if (selDistrictCode !== distCodeStr || selProvinceCode !== provCodeStr) {
                  setSelDistrictCode(distCodeStr);
                  setValue("district", matchDist.name, { shouldValidate: true });
                  setValue("ward", "", { shouldValidate: true });
                  setWards([]);
                }
              }
            }
          }

          setGeocodeStatus("success");
          addToast("Đã lấy tọa độ bản đồ tự động dựa vào địa chỉ của bạn!", "success");
          found = true;
          break;
        }
      }

      if (!found) {
        setGeocodeStatus("failed");
        addToast("Không tìm thấy tọa độ cụ thể. Hãy kiểm tra lại địa chỉ hoặc tự nhập tay.", "info");
      }
    } catch (err) {
      console.error("Lỗi định vị tọa độ:", err);
      setGeocodeStatus("failed");
      addToast("Không tìm thấy tọa độ cụ thể. Hãy kiểm tra lại địa chỉ hoặc tự nhập tay.", "info");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddressBlur = () => {
    if (address && district && city) {
      handleGeocode();
    }
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    try {
      setIsDeletingImageId(imageId);
      setImageError(null);
      await api.delete(`/posts/${params.id}/images/${imageId}`);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setImageError(axiosError.response?.data?.message ?? "Không thể xóa ảnh.");
    } finally {
      setIsDeletingImageId(null);
    }
  };

  const savePost = async (data: EditPostValues) => {
    const payload = {
      ...data,
      ward: data.ward || undefined,
      featureIds: selectedFeatureIds,
    };

    const response = await api.patch<{ data: Post }>(`/posts/${params.id}`, payload);

    if (newImages.length > 0) {
      const formData = new FormData();
      newImages.forEach((image) => {
        formData.append("images", image.file);
      });
      formData.append(
        "imageMetadata",
        JSON.stringify(
          newImages.map((image, index) => ({
            caption: image.file.name,
            order: images.length + index,
          })),
        ),
      );

      const imageResponse = await api.post<{ data: Post }>(`/posts/${params.id}/images`, formData);
      setPost(imageResponse.data.data);
      setImages(imageResponse.data.data.images);
      newImages.forEach((image) => URL.revokeObjectURL(image.url));
      setNewImages([]);
    } else {
      setPost(response.data.data);
      setImages(response.data.data.images);
    }

    router.push(`/posts/${params.id}`);
    router.refresh();
  };

  const onSubmit = async (data: EditPostValues) => {
    try {
      await savePost(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      addToast(axiosError.response?.data?.message ?? "Cập nhật bài đăng thất bại.", "error");
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10 lg:px-8">
        <div className="inline-flex items-center gap-3 text-[var(--secondary-foreground)]">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent)]" />
          Đang tải trang chỉnh sửa...
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="container mx-auto px-4 py-10 lg:px-8">
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-[var(--danger-foreground)]">{error}</p>
          <Link href={`/posts/${params.id}`} className="btn-primary mt-6 inline-flex">
            Quay lại bài đăng
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href={`/posts/${post.id}`}
              className="theme-icon-button mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full transition"
              title="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Chỉnh sửa bài đăng</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                ID: #{post.id} • Đăng ngày {toDateTime(post.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/posts/${post.id}`}
              className="theme-post-form-card inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]"
            >
              <Eye className="h-4 w-4" />
              Xem bài đăng
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Cập nhật bài đăng
            </button>
          </div>
        </div>



        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <section className="min-w-0 space-y-0">
            <div className="glass-card p-5 md:p-7">
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Thông tin cơ bản</h2>
                  <div className="mt-5 grid gap-5 lg:grid-cols-12">
                    <Field className="lg:col-span-8" label="Tiêu đề" required error={errors.title?.message}>
                      <input {...register("title")} className="input-dark" />
                    </Field>
                    <Field className="lg:col-span-4" label="Loại bất động sản" required error={errors.propertyType?.message}>
                      <select {...register("propertyType")} className="input-dark">
                        {PROPERTY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {propertyTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field className="lg:col-span-4" label="Loại tin" required error={errors.postType?.message}>
                      <select {...register("postType")} className="input-dark">
                        {POST_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {postTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field className="lg:col-span-4" label="Giá" required error={errors.price?.message}>
                      <div className="relative">
                        <input type="number" {...register("price")} className="input-dark pr-14" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">VND</span>
                      </div>
                    </Field>
                    <Field className="lg:col-span-4" label="Diện tích" required error={errors.area?.message}>
                      <div className="relative">
                        <input type="number" step="any" {...register("area")} className="input-dark pr-12" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">m²</span>
                      </div>
                    </Field>
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-7">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Vị trí & Bản đồ</h2>
                  <div className="mt-5 grid gap-5 lg:grid-cols-12">
                    <Field className="lg:col-span-12" label="Địa chỉ cụ thể" required error={errors.address?.message}>
                      <input {...register("address")} onBlur={handleAddressBlur} className="input-dark" />
                    </Field>
                    <Field className="lg:col-span-6" label="Tỉnh / Thành phố" required error={errors.city?.message}>
                      <select
                        {...register("city")}
                        className="input-dark"
                        value={selProvinceCode}
                        onChange={handleProvinceChange}
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field className="lg:col-span-6" label="Phường / Xã (hoặc Quận / Huyện)" required error={errors.district?.message}>
                      <select
                        {...register("district")}
                        className="input-dark"
                        value={selDistrictCode}
                        onChange={handleDistrictChange}
                        disabled={!selProvinceCode}
                      >
                        <option value="">-- Chọn Phường / Xã --</option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {!selProvinceCode && (
                        <p className="mt-1 text-xs text-[var(--danger-foreground)]">Vui lòng chọn Tỉnh / Thành phố</p>
                      )}
                    </Field>
                    <div className="lg:col-span-12">
                      <div className="flex items-center gap-4">
                        <input type="hidden" {...register("latitude")} />
                        <input type="hidden" {...register("longitude")} />
                        <button
                          type="button"
                          onClick={handleGeocode}
                          disabled={isGeocoding || !address || !city}
                          className="theme-button-secondary w-full inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGeocoding ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span>Định vị trên bản đồ</span>
                        </button>
                      </div>

                      {latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0 ? (
                        <>
                          <div className="theme-post-gallery mt-5 h-[280px] overflow-hidden rounded-xl">
                            <CreatePostMap
                              latitude={Number(latitude)}
                              longitude={Number(longitude)}
                              onChange={(lat, lng) => {
                                setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
                                setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
                              }}
                              onLocationSelect={async (addr, displayName) => {
                                if (addr) {
                                  setValue("address", addr, { shouldDirty: true, shouldValidate: true });
                                }
                                if (!displayName) return;
                                const nameParts = displayName.split(',').map((s: string) => s.trim());

                                let matchProv;
                                for (let i = nameParts.length - 1; i >= 0; i--) {
                                  const part = nameParts[i];
                                  const found = provinces.find(p => {
                                    const baseName = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
                                    return part === p.name || part === baseName || part.includes(p.name) || (baseName.length > 2 && part.includes(baseName));
                                  });
                                  if (found) {
                                    matchProv = found;
                                    break;
                                  }
                                }

                                if (matchProv) {
                                  const provCodeStr = String(matchProv.code);
                                  let currentDistricts = districts;

                                  if (selProvinceCode !== provCodeStr) {
                                    setSelProvinceCode(provCodeStr);
                                    setValue("city", matchProv.name, { shouldValidate: true });
                                    setSelDistrictCode("");
                                    setValue("district", "", { shouldValidate: true });
                                    setValue("ward", "", { shouldValidate: true });
                                    setWards([]);

                                    try {
                                      const distList = await fetchDistrictsByProvinceCode(provCodeStr);
                                      setDistricts(distList);
                                      currentDistricts = distList;
                                    } catch (e) {
                                      console.error("Lỗi fetch communes:", e);
                                    }
                                  }
                                  let matchDist;
                                  for (let i = nameParts.length - 1; i >= 0; i--) {
                                    const part = nameParts[i];
                                    const found = currentDistricts.find(d => {
                                      const baseDist = d.name.replace(/^(Phường|Xã|Thị trấn|Quận|Huyện|Thị xã|Thành phố)\s+/i, "");
                                      return part === d.name || part === baseDist || part.includes(d.name);
                                    });
                                    if (found) {
                                      matchDist = found;
                                      break;
                                    }
                                  }

                                  if (matchDist) {
                                    const distCodeStr = String(matchDist.code);

                                    if (selDistrictCode !== distCodeStr || selProvinceCode !== provCodeStr) {
                                      setSelDistrictCode(distCodeStr);
                                      setValue("district", matchDist.name, { shouldValidate: true });
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                          <p className="theme-badge-warning mt-5 flex items-start gap-2 rounded-lg p-4 text-xs font-medium leading-relaxed">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              <strong>Lưu ý:</strong> Bạn có thể kéo thả dấu mốc (Marker) hoặc click trực tiếp lên bản đồ trên để điều chỉnh vị trí mong muốn.
                            </span>
                          </p>
                        </>
                      ) : null}

                      {geocodeStatus === "success" ? (
                        <p className="mt-2 text-xs text-[var(--success-foreground)]">Đã cập nhật tọa độ bản đồ dựa vào địa chỉ.</p>
                      ) : null}
                      {geocodeStatus === "failed" ? (
                        <p className="mt-2 text-xs text-[var(--warning-foreground)]">Không tìm thấy tọa độ phù hợp. Hãy kiểm tra lại địa chỉ hoặc tự nhập tay.</p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-7">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Thông tin mô tả</h2>
                  <Field className="mt-5" label="Mô tả chi tiết" required error={errors.description?.message}>
                    <textarea
                      {...register("description")}
                      rows={9}
                      className="input-dark min-h-56 resize-y text-sm leading-7"
                    />
                    <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">{watchedDescription.length}/2000 ký tự</p>
                  </Field>
                </section>

                {/* Đặc trưng bất động sản */}
                {features.length > 0 && (
                  <section className="border-t border-[var(--border)] pt-7">
                    <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">Đặc trưng bất động sản</h2>
                    <div className="space-y-4">
                      {Object.entries(groupedFeatures).map(([category, list]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{category}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {list.map((feature) => {
                              const isSelected = selectedFeatureIds.includes(feature.id);
                              return (
                                <div
                                  key={feature.id}
                                  onClick={() => toggleFeature(feature.id)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 cursor-pointer select-none text-xs font-medium group ${isSelected
                                      ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent-border)] shadow-[var(--shadow-glow)]"
                                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-foreground)] hover:border-[var(--accent-border)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                                    }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FeatureIcon
                                      name={feature.icon || "help-circle"}
                                      className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isSelected ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"
                                        }`}
                                    />
                                    <span className="min-w-0 break-words leading-snug">{feature.name}</span>
                                  </div>
                                  {isSelected && (
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]">
                                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="glass-card p-5">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Hình ảnh & Video</h2>
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--secondary-foreground)]">
                    Ảnh đại diện <span className="text-[var(--danger)]">*</span>
                  </label>
                  <span className="text-xs text-[var(--muted-foreground)]">{totalImageCount}/{maxImages}</span>
                </div>
                <div className="theme-upload-preview group relative overflow-hidden rounded-lg">
                  <img src={primaryImage} alt={post.title} className="aspect-[16/9] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="theme-post-form-card absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] backdrop-blur transition hover:bg-[var(--hover)]"
                  >
                    <Camera className="h-4 w-4" />
                    Thay ảnh
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 text-sm font-medium text-[var(--secondary-foreground)]">Thư viện ảnh ({totalImageCount}/{maxImages})</div>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image) => (
                    <div key={image.id} className="theme-upload-preview group relative overflow-hidden rounded-lg">
                      <img src={image.imageUrl} alt={image.caption ?? post.title} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(image.id)}
                        disabled={isDeletingImageId === image.id}
                        className="theme-button-danger-solid absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-60"
                        title="Xóa ảnh"
                      >
                        {isDeletingImageId === image.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                  {newImages.map((image) => (
                    <div key={image.id} className="theme-upload-preview group relative overflow-hidden rounded-lg border-[var(--success-border)]">
                      <img src={image.url} alt={image.file.name} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(image.id)}
                        className="theme-button-danger-solid absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full transition"
                        title="Xóa ảnh"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {totalImageCount < maxImages && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="theme-upload-zone flex aspect-[4/3] items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:text-[var(--accent)]"
                    >
                      <ImagePlus className="h-6 w-6" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedPropertyImageInput}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleSelectImages(event.target.files);
                    event.target.value = "";
                  }}
                />
                {imageError && (
                  <p className="theme-badge-warning mt-3 rounded-lg p-2 text-xs">
                    {imageError}
                  </p>
                )}
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Thông tin người đăng</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--card)] text-xl font-bold text-[var(--foreground)]">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                  ) : (
                    authorInitial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                    <span className="truncate">{post.author.fullName}</span>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Môi giới chuyên nghiệp</p>
                  <p className="mt-2 text-xs text-[var(--secondary-foreground)]">{post.author.email}</p>
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Thống kê bài đăng</h2>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <Metric icon={<Eye className="h-4 w-4 text-[var(--accent)]" />} value="1,245" label="Lượt xem" />
                <Metric icon={<Building2 className="h-4 w-4 text-[var(--danger)]" />} value={formatPrice(Number(watchedPrice) || post.price)} label="Giá" />
                <Metric icon={<MessageCircle className="h-4 w-4 text-[var(--info)]" />} value="23" label="Bình luận" />
              </div>
              <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[var(--muted-foreground)]">Đăng ngày</p>
                  <p className="mt-1 text-[var(--foreground)]">{toDateTime(post.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Cập nhật lần cuối</p>
                  <p className="mt-1 text-[var(--foreground)]">{toDateTime(post.updatedAt)}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-[var(--secondary-foreground)]">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-[var(--danger-foreground)]">{error}</span> : null}
    </label>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0 border-r border-[var(--border)] last:border-r-0">
      <div className="flex items-center justify-center gap-2 font-semibold text-[var(--foreground)]">
        {icon}
        <span className="truncate">{value}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
