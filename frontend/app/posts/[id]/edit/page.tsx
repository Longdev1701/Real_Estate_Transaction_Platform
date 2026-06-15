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
  Upload,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Trash2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Star,
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
import { compressPropertyImage, yieldToBrowser } from "@/lib/image-compression";
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
  isMimeValid: boolean;
  isExtensionValid: boolean;
  isSizeValid: boolean;
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
  const [avatarImageId, setAvatarImageId] = useState<string | null>(null);

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
        if (currentPost.images && currentPost.images.length > 0) {
          const sorted = [...currentPost.images].sort((a, b) => a.order - b.order);
          setAvatarImageId(sorted[0].id);
        }

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
      processedFiles = [];

      for (const file of selectedFiles) {
        const originalValidation = getPropertyImageValidation(file);

        if (!originalValidation.isMimeValid && !originalValidation.isExtensionValid) {
          processedFiles.push({
            file,
            validation: originalValidation,
          });
        } else {
          const compressedFile = await compressPropertyImage(file);
          processedFiles.push({
            file: compressedFile,
            validation: getPropertyImageValidation(compressedFile),
          });
        }

        await yieldToBrowser();
      }
    } catch (error) {
      console.error("Failed to prepare images before upload:", error);
      setImageError("Không thể xử lý ảnh vừa chọn. Vui lòng thử lại.");
      return;
    }

    setNewImages((current) => [
      ...current,
      ...processedFiles.map(({ file, validation }) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
        isMimeValid: validation.isMimeValid,
        isExtensionValid: validation.isExtensionValid,
        isSizeValid: validation.isSizeValid,
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
    setNewImages((currentImages) => {
      const exists = currentImages.find((image) => image.id === id);
      if (exists) {
        URL.revokeObjectURL(exists.url);
      }
      return currentImages.filter((image) => image.id !== id);
    });
  };

  useEffect(() => {
    const allIds = [...images.map((img) => img.id), ...newImages.map((img) => img.id)];
    if (allIds.length > 0) {
      const exists = allIds.includes(avatarImageId ?? "");
      if (!exists) {
        setAvatarImageId(images.length > 0 ? images[0].id : newImages[0].id);
      }
    } else {
      setAvatarImageId(null);
    }
  }, [images, newImages, avatarImageId]);

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
        console.error("Lỗi tải danh sách phường xã hoặc định vị:", err);
      }
    } else {
      setValue("city", "", { shouldValidate: true });
      setValue("latitude", 0);
      setValue("longitude", 0);
      setGeocodeStatus("idle");
    }
    setValue("district", "", { shouldValidate: true });
    setValue("ward", "");
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
      setValue("latitude", 0);
      setValue("longitude", 0);
      setGeocodeStatus("idle");
    }
    setValue("ward", "");
  };

  const handleGeocode = async () => {
    if (!city || !district || !address) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeStatus("idle");

    const streetOnly = address.replace(/^\d+([a-zA-Z]?)(\/\d+)*\s+/, "").trim();

    const queries = [
      [address, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [streetOnly !== address ? streetOnly : null, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [district, city, "Việt Nam"].filter(Boolean).join(", "),
      [city, "Việt Nam"].filter(Boolean).join(", "),
    ];

    try {
      let found = false;

      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1&addressdetails=1&accept-language=vi`,
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

    const uploadableNewImages = newImages.filter(
      (image) => image.isSizeValid && (image.isMimeValid || image.isExtensionValid),
    );

    if (uploadableNewImages.length > 0) {
      const formData = new FormData();
      uploadableNewImages.forEach((image) => {
        formData.append("images", image.file);
      });
      formData.append(
        "imageMetadata",
        JSON.stringify(
          uploadableNewImages.map((image, index) => ({
            caption: image.file.name,
            order: image.id === avatarImageId ? 0 : images.length + index + 1,
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
    <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-6 lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden flex flex-col">
      <div className="mb-4 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/posts/${post.id}`}
            className="theme-icon-button inline-flex h-9 w-9 items-center justify-center rounded-full transition"
            title="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-[var(--foreground)]">Chỉnh sửa bài đăng</h1>
        </div>

        <div className="flex w-full sm:w-auto">
          <Link
            href={`/posts/${post.id}`}
            className="theme-post-form-card w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]"
          >
            <Eye className="h-4 w-4" />
            Xem bài đăng
          </Link>
        </div>
      </div>

      <form id="edit-post-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1.3fr_1fr] min-w-0 min-h-0 flex-1 w-full lg:overflow-hidden">

        {/* CỘT TRÁI: Bảng nhập thông tin */}
        <div className="flex min-w-0 min-h-0 flex-col lg:overflow-y-auto custom-scrollbar space-y-6 lg:pr-2 pb-24 lg:pb-0">
          
          {/* Card 1: Thông tin cơ bản */}
          <div className="theme-post-form-shell p-4 sm:p-5">
            <h2 className="mb-4 shrink-0 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--accent)]">Thông tin cơ bản</h2>
            <div className="space-y-4">
            <div>
              <label className="theme-post-label mb-1 block text-xs font-medium">Tiêu đề bài đăng <span className="text-[var(--danger)]">*</span></label>
              <input
                type="text"
                {...register("title")}
                className="input-dark py-2 text-sm"
                placeholder="Ví dụ: Căn hộ cao cấp 2PN view sông Quận 7"
              />
              {errors.title && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.title.message}</p>}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Loại hình bất động sản</label>
                <select {...register("propertyType")} className="input-dark py-2 text-sm">
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {propertyTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Nhu cầu đăng bài</label>
                <select {...register("postType")} className="input-dark py-2 text-sm">
                  <option value="SELL">Bán</option>
                  <option value="RENT">Cho thuê</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Giá bán / thuê (VND) <span className="text-[var(--danger)]">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={watch("price") !== undefined && watch("price") !== null ? String(watch("price")).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setValue("price", raw ? Number(raw) : 0, { shouldValidate: true, shouldDirty: true });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setValue("price", (Number(watch("price")) || 0) + 1000000, { shouldValidate: true, shouldDirty: true });
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setValue("price", Math.max(0, (Number(watch("price")) || 0) - 1000000), { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    placeholder="Ví dụ: 1.500.000.000"
                    className="input-dark py-2 text-sm pr-8"
                  />
                  <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-[2px]">
                    <button
                      type="button"
                      onClick={() => setValue("price", (Number(watch("price")) || 0) + 1000000, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("price", Math.max(0, (Number(watch("price")) || 0) - 1000000), { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {errors.price && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.price.message}</p>}
              </div>

              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Diện tích (m²) <span className="text-[var(--danger)]">*</span></label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    {...register("area")}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setValue("area", (Number(watch("area")) || 0) + 1, { shouldValidate: true, shouldDirty: true });
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setValue("area", Math.max(0, (Number(watch("area")) || 0) - 1), { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    placeholder="Ví dụ: 75"
                    className="input-dark py-2 text-sm pr-8 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-[2px]">
                    <button
                      type="button"
                      onClick={() => setValue("area", (Number(watch("area")) || 0) + 1, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("area", Math.max(0, (Number(watch("area")) || 0) - 1), { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {errors.area && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.area.message}</p>}

              </div>
            </div>
          </div>
          </div>

          {/* Card 2: Vị trí & Bản đồ */}
          <div className="theme-post-form-shell p-4 sm:p-5">
            <h2 className="mb-4 shrink-0 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--accent)]">Vị trí & Bản đồ</h2>
            <div className="space-y-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Tỉnh / Thành phố <span className="text-[var(--danger)]">*</span></label>
                <select
                  value={selProvinceCode}
                  onChange={handleProvinceChange}
                  className="input-dark py-2 text-sm"
                >
                  <option value="">-- Chọn Tỉnh / Thành --</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.city.message}</p>}
              </div>

              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Phường / Xã (hoặc Quận / Huyện) <span className="text-[var(--danger)]">*</span></label>
                <select
                  value={selDistrictCode}
                  onChange={handleDistrictChange}
                  disabled={!selProvinceCode}
                  className="input-dark py-2 text-sm disabled:opacity-50"
                >
                  <option value="">-- Chọn Phường / Xã --</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.district && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.district.message}</p>}
              </div>
            </div>

            <div>
              <label className="theme-post-label mb-1 block text-xs font-medium">Địa chỉ cụ thể <span className="text-[var(--danger)]">*</span></label>
              <input
                type="text"
                {...register("address")}
                onBlur={handleAddressBlur}
                className="input-dark py-2 text-sm"
                placeholder="Ví dụ: Số 105 Đường Nguyễn Văn Linh"
              />
              {errors.address && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.address.message}</p>}
            </div>

            <div className="flex items-center gap-4">
              <input type="hidden" {...register("latitude")} />
              <input type="hidden" {...register("longitude")} />

              <button
                type="button"
                onClick={handleGeocode}
                disabled={isGeocoding || !address || !city}
                className="theme-button-secondary w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5 h-[38px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isGeocoding ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                <span>Định vị trên bản đồ</span>
              </button>
            </div>

            <div className="theme-post-gallery relative z-0 mt-2 h-[180px] sm:h-[220px] w-full shrink-0 overflow-hidden rounded-xl">
              <CreatePostMap
                latitude={Number(latitude) || 0}
                longitude={Number(longitude) || 0}
                onChange={(lat, lng) => {
                  setValue("latitude", lat, { shouldValidate: true });
                  setValue("longitude", lng, { shouldValidate: true });
                }}
              />
            </div>
            </div>
          </div>

          {/* Card 3: Thông tin mô tả */}
          <div className="theme-post-form-shell p-4 sm:p-5">
            <h2 className="mb-4 shrink-0 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--accent)]">Thông tin mô tả</h2>
            <div className="space-y-4">
            <div>
              <label className="theme-post-label mb-1 block text-xs font-medium">Mô tả bài đăng <span className="text-[var(--danger)]">*</span></label>
              <textarea
                {...register("description")}
                className="input-dark min-h-[90px] text-sm"
                placeholder="Mô tả chi tiết về bất động sản (pháp lý, hướng nhà, tiện ích xung quanh, tình trạng nội thất...)"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.description.message}</p>
              )}
            </div>
            </div>
          </div>

          {/* Đặc trưng bất động sản */}
          {features.length > 0 && (
            <div className="theme-post-form-shell p-4 sm:p-5">
              <h2 className="mb-4 shrink-0 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--accent)]">Đặc trưng bất động sản</h2>
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
              </div>
          )}
        </div>

        {/* CỘT PHẢI: Hình ảnh & Nút Submit */}
        <div className="theme-post-form-shell flex min-w-0 min-h-0 flex-col p-4 sm:p-5 lg:overflow-y-auto custom-scrollbar lg:pb-5">
          <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--border)] pb-2">
            <h2 className="text-base font-semibold text-[var(--accent)]">Hình ảnh bất động sản</h2>
            <span className="theme-badge-info rounded-full px-2 py-0.5 text-xs font-medium">
              {totalImageCount}/{maxImages} ảnh
            </span>
          </div>

          <div className="space-y-5 flex-1 flex flex-col min-h-0">
            {/* Dropzone upload */}
            <div className="theme-upload-zone shrink-0 rounded-xl lg:rounded-2xl p-2 lg:p-4 transition duration-300">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-row lg:flex-col items-center justify-center gap-3 lg:gap-2 py-2 lg:py-4 text-[var(--secondary-foreground)] hover:text-[var(--foreground)]"
              >
                <Upload className="h-5 w-5 lg:h-7 lg:w-7 animate-bounce text-[var(--accent)] shrink-0" />
                <div className="flex flex-col lg:items-center text-left lg:text-center">
                  <span className="text-[13px] lg:text-sm font-semibold">Tải ảnh lên tại đây</span>
                  <span className="text-[11px] lg:text-xs text-[var(--muted-foreground)] hidden lg:inline">Chấp nhận định dạng JPG, PNG, WEBP. Tối đa 5MB/ảnh</span>
                  <span className="text-[11px] lg:text-xs text-[var(--muted-foreground)] lg:hidden">Tối đa 5MB/ảnh (JPG, PNG)</span>
                </div>
              </button>
            </div>
            
            <div className="flex-1 min-w-0 min-h-0 flex flex-col justify-center">
              {totalImageCount > 0 && (
                <span className="theme-post-helper mb-2 block shrink-0 text-[11px] lg:text-xs font-medium">Danh sách ảnh đã tải lên (trượt ngang):</span>
              )}

              {totalImageCount === 0 ? (
                <div className="theme-upload-preview hidden lg:flex flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center text-[var(--muted-foreground)]">
                  <ImagePlus className="mb-2 h-7 w-7 text-[var(--accent)]" />
                  <p className="text-xs">Chưa có hình ảnh nào được tải lên.</p>
                </div>
              ) : (
                <div className="flex w-full min-w-0 items-center gap-3 lg:gap-4 overflow-x-auto pb-2 lg:pb-4 pt-1 custom-scrollbar mobile-hide-scroll min-h-[160px] max-h-[220px]">
                  {/* Ảnh cũ */}
                  {images.map((image, index) => {
                    const isAvatar = image.id === avatarImageId;
                    return (
                      <div key={image.id} className={`theme-upload-preview group relative shrink-0 w-36 aspect-[4/3] overflow-hidden rounded-xl border transition duration-300 ${isAvatar ? 'border-[var(--success-border)] ring-2 ring-[color:var(--success-border)] scale-[1.02]' : ''}`}>
                        <img src={image.imageUrl} alt={image.caption ?? post.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-100 lg:opacity-0 transition-opacity duration-200 lg:group-hover:opacity-100 lg:bg-black/20 pointer-events-none">
                            <div className="flex justify-end pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingImage(image.id)}
                                disabled={isDeletingImageId === image.id}
                                className="bg-black/50 text-white hover:bg-red-500 flex h-6 w-6 items-center justify-center rounded-full transition backdrop-blur-sm"
                                title="Xóa ảnh"
                              >
                                {isDeletingImageId === image.id ? (
                                  <LoaderCircle className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            
                            {!isAvatar && (
                              <button
                                type="button"
                                onClick={() => setAvatarImageId(image.id)}
                                className="bg-black/50 hover:bg-green-600 text-white w-full rounded-md py-1 text-[10px] font-medium transition backdrop-blur-sm flex items-center justify-center gap-1 pointer-events-auto"
                              >
                                <Star className="h-3 w-3" />
                                <span>Đại diện</span>
                              </button>
                            )}
                        </div>
                        {isAvatar ? (
                          <div className="theme-badge-success absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                            Ảnh đại diện
                          </div>
                        ) : (
                          <div className="absolute top-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                            Ảnh #{index + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Ảnh mới */}
                  {newImages.map((image, index) => {
                    const isAvatar = image.id === avatarImageId;
                    return (
                      <div key={image.id} className={`theme-upload-preview group relative shrink-0 w-36 aspect-[4/3] overflow-hidden rounded-xl border transition duration-300 ${isAvatar ? 'border-[var(--success-border)] ring-2 ring-[color:var(--success-border)] scale-[1.02]' : 'border-[var(--success-border)]'}`}>
                        <img src={image.url} alt={image.file.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-100 lg:opacity-0 transition-opacity duration-200 lg:group-hover:opacity-100 lg:bg-black/20 pointer-events-none">
                            <div className="flex justify-end pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => handleRemoveNewImage(image.id)}
                                className="bg-black/50 text-white hover:bg-red-500 flex h-6 w-6 items-center justify-center rounded-full transition backdrop-blur-sm"
                                title="Xóa ảnh mới"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            
                            {!isAvatar && (
                              <button
                                type="button"
                                onClick={() => setAvatarImageId(image.id)}
                                className="bg-black/50 hover:bg-green-600 text-white w-full rounded-md py-1 text-[10px] font-medium transition backdrop-blur-sm flex items-center justify-center gap-1 pointer-events-auto"
                              >
                                <Star className="h-3 w-3" />
                                <span>Đại diện</span>
                              </button>
                            )}
                        </div>
                        {isAvatar ? (
                          <div className="theme-badge-success absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                            Ảnh đại diện
                          </div>
                        ) : (
                          <div className="absolute top-1.5 left-1.5 rounded-md bg-[var(--success)] px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                            Mới #{index + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
              <p className="theme-badge-warning shrink-0 rounded-lg p-2.5 text-xs">
                {imageError}
              </p>
            )}

            {/* Nút gửi bài viết cuối trang */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--background)] p-4 border-t border-[var(--border)] lg:relative lg:p-0 lg:border-t-0 lg:pt-4 shrink-0 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:shadow-none">
              <div className="flex gap-3 h-[48px]">
                <Link
                  href={`/posts/${params.id}`}
                  className="inline-flex items-center justify-center gap-2 h-full px-4 text-sm font-semibold rounded-xl bg-[var(--card)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--foreground)] transition-all shrink-0"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Hủy chỉnh sửa</span>
                  <span className="sm:hidden">Hủy</span>
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary inline-flex flex-1 items-center justify-center gap-2 h-full py-0 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Cập nhật bài đăng
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      </form>

      {/* CSS tùy biến scrollbar để giao diện mượt mà nhất */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: color-mix(in srgb, var(--foreground) 2%, transparent);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--foreground) 10%, transparent);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: color-mix(in srgb, var(--foreground) 20%, transparent);
        }
        @media (max-width: 1024px) {
          .mobile-hide-scroll::-webkit-scrollbar {
            display: none;
          }
          .mobile-hide-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
      ` }} />
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
