"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import {
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
  MapPin,
  Check,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { api } from "@/lib/api";
import { FeatureIcon } from "@/lib/feature-icons";
import { compressPropertyImage } from "@/lib/image-compression";
import { PROPERTY_TYPES, propertyTypeLabels } from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";

const createPostSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải từ 5 ký tự trở lên"),
  description: z.string().min(10, "Mô tả phải từ 10 ký tự trở lên"),
  price: z.coerce.number().positive("Giá phải lớn hơn 0"),
  area: z.coerce.number().positive("Diện tích phải lớn hơn 0"),
  address: z.string().min(3, "Vui lòng nhập địa chỉ cụ thể"),
  city: z.string().min(2, "Vui lòng chọn Tỉnh / Thành phố"),
  district: z.string().min(2, "Vui lòng chọn Quận / Huyện"),
  ward: z.string().optional(),
  latitude: z.coerce.number().min(-90, "Vĩ độ phải từ -90 đến 90").max(90, "Vĩ độ phải từ -90 đến 90"),
  longitude: z.coerce.number().min(-180, "Kinh độ phải từ -180 đến 180").max(180, "Kinh độ phải từ -180 đến 180"),
  propertyType: z.enum(PROPERTY_TYPES),
  postType: z.enum(["SELL", "RENT"]),
});

type CreatePostFormInput = z.input<typeof createPostSchema>;
type CreatePostFormValues = z.output<typeof createPostSchema>;
type ImagePreview = {
  file: File;
  url: string;
  id: string;
  isMimeValid: boolean;
  isExtensionValid: boolean;
  isSizeValid: boolean;
};

interface Province {
  code: number;
  name: string;
}

interface Feature {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
}
interface District {
  code: number;
  name: string;
}
interface Ward {
  code: number;
  name: string;
}

const acceptedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const acceptedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/pjpeg",
]);
const maxFileSizeInBytes = 5 * 1024 * 1024;
const maxFiles = 10;
const DRAFT_KEY = "trustestate-create-post-draft";

const getFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
};

const getImageValidation = (file: File) => {
  const extension = getFileExtension(file.name);
  const isMimeValid = acceptedMimeTypes.has(file.type);
  const isExtensionValid = acceptedExtensions.has(extension);
  const isSizeValid = file.size <= maxFileSizeInBytes;

  return {
    isMimeValid,
    isExtensionValid,
    isSizeValid,
    isUploadable: isSizeValid && (isMimeValid || isExtensionValid),
  };
};

import dynamic from "next/dynamic";

const CreatePostMap = dynamic(() => import("@/components/map/CreatePostMap"), {
  ssr: false,
  loading: () => (
    <div className="theme-post-gallery mt-2 flex h-[220px] items-center justify-center rounded-xl text-xs text-[var(--muted-foreground)]">
      Đang tải bản đồ...
    </div>
  ),
});

export default function CreatePostPage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "success" | "failed">("idle");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [avatarImageId, setAvatarImageId] = useState<string | null>(null);

  // States cho đặc trưng bất động sản
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  // States cho Tỉnh/Huyện/Xã
  const [adminTree, setAdminTree] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selProvinceCode, setSelProvinceCode] = useState<string>("");
  const [selDistrictCode, setSelDistrictCode] = useState<string>("");

  const previewsRef = useRef<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormInput, unknown, CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      propertyType: "HOUSE",
      postType: "SELL",
      city: "",
      district: "",
      ward: "",
    },
  });

  // Đăng ký thủ công các trường địa phương để RHF tracking
  useEffect(() => {
    register("city");
    register("district");
    register("ward");
    register("price");
  }, [register]);

  const watchAllFields = watch();
  const city = watch("city");
  const district = watch("district");
  const ward = watch("ward");
  const address = watch("address");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const propertyType = watch("propertyType");

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await api.get<{ data: Feature[] }>(`/features?propertyType=${propertyType}`);
        setFeatures(response.data.data);
        const availableIds = new Set(response.data.data.map((f) => f.id));
        setSelectedFeatureIds((prev) => prev.filter((id) => availableIds.has(id)));
      } catch (err) {
        console.error("Lỗi tải đặc trưng:", err);
      }
    };
    if (propertyType) {
      fetchFeatures();
    }
  }, [propertyType]);

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, Feature[]> = {};
    features.forEach((feature) => {
      const cat = feature.category || "Đặc trưng khác";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(feature);
    });
    return groups;
  }, [features]);

  // Load provinces and draft on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const pRes = await fetch("https://esgoo.net/api-tinhthanh/1/0.htm");
        const pDataObj = await pRes.json();

        const pData: Province[] = (pDataObj.data || []).map((p: any) => ({ code: Number(p.id), name: p.full_name }));
        setProvinces(pData);

        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);

          // Set các trường văn bản trước
          Object.entries(parsed).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== "") {
              setValue(key as any, val);
            }
          });

          // Khôi phục các select theo cấp bậc
          if (parsed.city) {
            const matchProv = pData.find((p) => p.name === parsed.city);
            if (matchProv) {
              setSelProvinceCode(String(matchProv.code));

              try {
                const cRes = await fetch(`https://esgoo.net/api-tinhthanh/2/${matchProv.code}.htm`);
                const cDataObj = await cRes.json();
                const distList: District[] = (cDataObj.data || [])
                  .map((c: any) => ({ code: Number(c.id), name: c.full_name.replace(/\n/g, "").trim() }))
                  .sort((a: District, b: District) => a.name.localeCompare(b.name, 'vi'));
                setDistricts(distList);

                const matchDist = distList.find((d) => d.name === parsed.district);
                if (matchDist) {
                  setSelDistrictCode(String(matchDist.code));
                  // API mới không có data3 (phường/xã)
                  setWards([]);
                }
              } catch (e) {
                console.error("Lỗi fetch communes", e);
              }
            }
          }
          setShowDraftToast(true);
          setTimeout(() => setShowDraftToast(false), 5000);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo danh sách địa bàn:", err);
      } finally {
        setDraftLoaded(true);
      }
    };
    initialize();
  }, [setValue]);

  // Save draft when form fields change
  useEffect(() => {
    if (draftLoaded) {
      const textFields = { ...watchAllFields };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(textFields));
    }
  }, [watchAllFields, draftLoaded]);

  // Giữ ảnh đại diện luôn hợp lệ
  useEffect(() => {
    if (imagePreviews.length > 0) {
      const exists = imagePreviews.some((img) => img.id === avatarImageId);
      if (!exists) {
        setAvatarImageId(imagePreviews[0].id);
      }
    } else {
      setAvatarImageId(null);
    }
  }, [imagePreviews, avatarImageId]);

  // Auto-geocoding function
  const handleGeocode = async () => {
    if (!city || !district || !address) {
      return;
    }
    setIsGeocoding(true);
    setGeocodeStatus("idle");

    // Các mức độ tìm kiếm từ chi tiết đến khái quát để tránh bị trống hoặc định vị sai vùng miền
    const queries = [
      [address, ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
      [district, city, "Việt Nam"].filter(Boolean).join(", "),
      [city, "Việt Nam"].filter(Boolean).join(", ")
    ];

    try {
      let found = false;
      for (const query of queries) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1&addressdetails=1&accept-language=vi`,
          {
            headers: {
              "Accept-Language": "vi",
            },
          }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setValue("latitude", lat, { shouldValidate: true });
          setValue("longitude", lon, { shouldValidate: true });

          // Lấy address và đồng bộ hóa lại dropdown
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
                  const res = await fetch(`https://esgoo.net/api-tinhthanh/2/${provCodeStr}.htm`);
                  const data = await res.json();
                  const distList: District[] = (data.data || [])
                    .map((c: any) => ({ code: Number(c.id), name: c.full_name.replace(/\n/g, "").trim() }))
                    .sort((a: District, b: District) => a.name.localeCompare(b.name, 'vi'));
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
                let currentWards = wards;

                if (selDistrictCode !== distCodeStr || selProvinceCode !== provCodeStr) {
                  setSelDistrictCode(distCodeStr);
                  setValue("district", matchDist.name, { shouldValidate: true });
                  setValue("ward", "", { shouldValidate: true });

                  setWards([]);
                  currentWards = [];
                }

                const matchWard = currentWards.find(w => {
                  const baseWard = w.name.replace(/^(Phường|Xã|Thị trấn)\s+/i, "");
                  return nameParts.some((part: string) => part === w.name || part === baseWard || part.includes(w.name) || (baseWard.length > 2 && part.includes(baseWard)));
                });

                if (matchWard) {
                  setValue("ward", matchWard.name, { shouldValidate: true });
                }
              }
            }
          }

          setGeocodeStatus("success");
          found = true;
          break; // Dừng lại ngay khi tìm thấy mức độ khớp đầu tiên
        }
      }

      if (!found) {
        setGeocodeStatus("failed");
      }
    } catch (err) {
      console.error("Lỗi định vị tọa độ:", err);
      setGeocodeStatus("failed");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Trigger geocode on blur of address input
  const handleAddressBlur = () => {
    if (address && district && city) {
      handleGeocode();
    }
  };

  // Lắng nghe sự kiện đổi Tỉnh/Thành
  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelProvinceCode(code);
    setSelDistrictCode("");
    setDistricts([]);
    setWards([]);

    if (code) {
      const name = provinces.find((p) => String(p.code) === code)?.name || "";
      setValue("city", name, { shouldValidate: true });

      try {
        const res = await fetch(`https://esgoo.net/api-tinhthanh/2/${code}.htm`);
        const data = await res.json();
        const dataList: District[] = (data.data || [])
          .map((c: any) => ({ code: Number(c.id), name: c.full_name.replace(/\n/g, "").trim() }))
          .sort((a: District, b: District) => a.name.localeCompare(b.name, 'vi'));
        setDistricts(dataList);
      } catch (err) {
        console.error("Lỗi tải danh sách phường xã:", err);
      }
    } else {
      setValue("city", "", { shouldValidate: true });
    }
    setValue("district", "", { shouldValidate: true });
    setValue("ward", "");

    // Xóa tọa độ cũ
    setValue("latitude", 0);
    setValue("longitude", 0);
    setGeocodeStatus("idle");
  };

  // Lắng nghe sự kiện đổi Quận/Huyện
  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelDistrictCode(code);
    setWards([]);

    if (code) {
      const name = districts.find((d) => String(d.code) === code)?.name || "";
      setValue("district", name, { shouldValidate: true });

      // API mới không có phường xã
      setWards([]);
    } else {
      setValue("district", "", { shouldValidate: true });
    }
    setValue("ward", "");

    // Xóa tọa độ cũ
    setValue("latitude", 0);
    setValue("longitude", 0);
    setGeocodeStatus("idle");
  };

  // Lắng nghe sự kiện đổi Phường/Xã
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setValue("ward", name);

    // Tự động định vị nếu đầy đủ thông tin
    if (address && district && city) {
      setTimeout(() => {
        handleGeocode();
      }, 100);
    }
  };

  const selectedImages = useMemo(
    () =>
      imagePreviews
        .filter((image) => image.isSizeValid && (image.isMimeValid || image.isExtensionValid))
        .map((image) => image.file),
    [imagePreviews],
  );

  const handleImageSelection = async (files: FileList | null) => {
    if (!files) {
      return;
    }

    setImageError(null);
    const incomingFiles = Array.from(files);
    const currentImageCount = previewsRef.current.length;
    const appendedFiles = incomingFiles.slice(0, maxFiles - currentImageCount);
    const skippedCount = Math.max(0, incomingFiles.length - appendedFiles.length);

    if (appendedFiles.length === 0) {
      setImageError(
        skippedCount > 0 ? `Chỉ được chọn tối đa ${maxFiles} ảnh. ${skippedCount} ảnh đã bị bỏ qua.` : null,
      );
      return;
    }

    let processedFiles: Array<{
      file: File;
      validation: ReturnType<typeof getImageValidation>;
    }>;

    try {
      processedFiles = await Promise.all(
        appendedFiles.map(async (file) => {
          const originalValidation = getImageValidation(file);

          if (!originalValidation.isMimeValid && !originalValidation.isExtensionValid) {
            return {
              file,
              validation: originalValidation,
            };
          }

          const compressedFile = await compressPropertyImage(file);
          return {
            file: compressedFile,
            validation: getImageValidation(compressedFile),
          };
        }),
      );
    } catch (error) {
      console.error("Failed to prepare images before upload:", error);
      setImageError("Không thể xử lý ảnh vừa chọn. Vui lòng thử lại.");
      return;
    }

    const nextPreviews = processedFiles.map(({ file, validation }) => ({
      file,
      url: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      isMimeValid: validation.isMimeValid,
      isExtensionValid: validation.isExtensionValid,
      isSizeValid: validation.isSizeValid,
    }));

    setImagePreviews((currentImages) => [...currentImages, ...nextPreviews]);

    const uploadableCount = processedFiles.filter(({ validation }) => validation.isUploadable).length;
    const invalidTypeCount = processedFiles.filter(({ validation }) => {
      return !validation.isMimeValid && !validation.isExtensionValid;
    }).length;
    const oversizedCount = processedFiles.filter(({ validation }) => !validation.isSizeValid).length;

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
        skippedCount > 0 ? `${skippedCount} ảnh vượt giới hạn ${maxFiles}` : null,
      ].filter(Boolean);

      setImageError(`Đã thêm ${uploadableCount} ảnh hợp lệ. ${messages.join(", ")}.`);
      return;
    }

    setImageError(null);
  };

  const handleRemoveImage = (id: string) => {
    setImagePreviews((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }

      return currentImages.filter((image) => image.id !== id);
    });
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onSubmit = async (data: CreatePostFormValues) => {
    try {
      setError(null);

      if (selectedImages.length === 0) {
        setError("Vui lòng chọn ít nhất một hình ảnh hợp lệ (JPG, PNG, WEBP và tối đa 5MB mỗi ảnh).");
        return;
      }

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formData.append(key, String(value));
        }
      });

      selectedImages.forEach((image) => {
        formData.append("images", image);
      });

      if (selectedFeatureIds.length > 0) {
        formData.append("featureIds", selectedFeatureIds.join(","));
      }

      // Tạo metadata gửi lên backend để set order: 0 cho ảnh đại diện
      const metadata = imagePreviews.map((img, idx) => {
        const isAvatar = img.id === avatarImageId;
        return {
          caption: img.file.name,
          order: isAvatar ? 0 : (idx + 1),
        };
      });
      formData.append("imageMetadata", JSON.stringify(metadata));

      const response = await api.post("/posts", formData);

      // Xóa bản nháp sau khi gửi thành công
      localStorage.removeItem(DRAFT_KEY);

      const createdPostId = response.data.data.id as string | undefined;
      router.push(createdPostId ? `/posts/${createdPostId}` : "/posts");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Đăng bài thất bại. Vui lòng kiểm tra lại thông tin.");
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-6 lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden flex flex-col">
      {/* Toast báo khôi phục bản nháp */}
      {showDraftToast && (
        <div className="theme-badge-info fixed right-6 top-20 z-50 flex animate-in items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-[var(--shadow-glow)] backdrop-blur-md fade-in slide-in-from-top-4 duration-300">
          <Save className="h-4 w-4" />
          <span>Đã tự động khôi phục thông tin bài đăng nháp của bạn!</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Đăng bài mới</h1>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Điền các thông tin mô tả chi tiết, vị trí và tải ảnh lên trực quan.
          </p>
        </div>
        <span className="theme-badge-info rounded-full px-3 py-1 text-xs font-medium">
          Tài khoản: {user.fullName}
        </span>
      </div>

      {error && (
        <div className="theme-badge-danger mb-4 shrink-0 rounded-xl p-3 text-xs">
          {error}
        </div>
      )}

      {/* Grid ngang 2 phần, nằm trọn trên 1 page trên desktop */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.3fr_1fr] min-h-0 flex-1 overflow-hidden">

        {/* CỘT TRÁI: Bảng nhập thông tin */}
        <div className="theme-post-form-shell flex min-h-0 flex-col p-5 lg:overflow-y-auto custom-scrollbar">
          <h2 className="mb-4 shrink-0 border-b border-[var(--border)] pb-2 text-base font-semibold text-[var(--accent)]">Thông tin chi tiết</h2>

          <div className="space-y-4 flex-1 pr-1">
            {/* Tiêu đề */}
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

            {/* Loại & Nhu cầu */}
            <div className="grid gap-4 grid-cols-2">
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

            {/* Giá & Diện tích */}
            <div className="grid gap-4 grid-cols-2">
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

            {/* Khu vực chọn cấp bậc */}
            <div className="grid gap-3 grid-cols-2">
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

            {/* Địa chỉ cụ thể */}
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

            {/* Tọa độ Map */}
            <div className="grid gap-4 grid-cols-[1fr_1fr_auto] items-end">
              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Vĩ độ (Lat)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    {...register("latitude")}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setValue("latitude", (Number(watch("latitude")) || 0) + 0.0001, { shouldValidate: true, shouldDirty: true });
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setValue("latitude", (Number(watch("latitude")) || 0) - 0.0001, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    className="input-dark theme-post-input py-2 text-sm pr-8 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-[2px]">
                    <button
                      type="button"
                      onClick={() => setValue("latitude", (Number(watch("latitude")) || 0) + 0.0001, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("latitude", (Number(watch("latitude")) || 0) - 0.0001, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {errors.latitude && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.latitude.message}</p>}
              </div>

              <div>
                <label className="theme-post-label mb-1 block text-xs font-medium">Kinh độ (Lng)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    {...register("longitude")}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setValue("longitude", (Number(watch("longitude")) || 0) + 0.0001, { shouldValidate: true, shouldDirty: true });
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setValue("longitude", (Number(watch("longitude")) || 0) - 0.0001, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    className="input-dark theme-post-input py-2 text-sm pr-8 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-[2px]">
                    <button
                      type="button"
                      onClick={() => setValue("longitude", (Number(watch("longitude")) || 0) + 0.0001, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("longitude", (Number(watch("longitude")) || 0) - 0.0001, { shouldValidate: true, shouldDirty: true })}
                      className="theme-step-button rounded p-[2px] focus:outline-none"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {errors.longitude && <p className="mt-1 text-xs text-[var(--danger-foreground)]">{errors.longitude.message}</p>}
              </div>

              <button
                type="button"
                onClick={handleGeocode}
                disabled={isGeocoding || !address || !city}
                className="btn-primary py-2 px-3 text-xs flex items-center gap-1 h-[38px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isGeocoding ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                <span>Tìm vị trí</span>
              </button>
            </div>

            {/* Trạng thái định vị */}
            {geocodeStatus === "success" && (
              <p className="mt-[-8px] flex items-center gap-1 text-xs text-[var(--success-foreground)]">
                <Check className="h-3.5 w-3.5" /> Đã lấy tọa độ bản đồ tự động dựa vào địa chỉ của bạn!
              </p>
            )}
            {geocodeStatus === "failed" && (
              <p className="mt-[-8px] text-xs text-[var(--warning-foreground)]">
                Không tìm thấy tọa độ cụ thể. Hãy kiểm tra lại địa chỉ hoặc tự nhập tay.
              </p>
            )}

            {/* Bản đồ xem trước */}
            {latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0 ? (
              <>
                <div className="theme-post-gallery relative mt-2 h-[220px] w-full shrink-0 overflow-hidden rounded-xl">
                  <CreatePostMap
                    latitude={Number(latitude)}
                    longitude={Number(longitude)}
                    onChange={(lat, lng) => {
                      setValue("latitude", lat, { shouldValidate: true });
                      setValue("longitude", lng, { shouldValidate: true });
                    }}
                    onLocationSelect={async (addr, displayName) => {
                      if (addr) {
                        setValue("address", addr, { shouldValidate: true });
                      }

                      if (!displayName) return;
                      const nameParts = displayName.split(',').map((s: string) => s.trim());

                      // Tìm Tỉnh/Thành phố
                      let matchProv;
                      for (let i = nameParts.length - 1; i >= 0; i--) {
                        const part = nameParts[i];
                        const found = provinces.find(p => {
                          const baseProv = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
                          return part === p.name || part === baseProv || part.includes(p.name) || (baseProv.length > 2 && part.includes(baseProv));
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
                            const res = await fetch(`https://esgoo.net/api-tinhthanh-new/1/0.htm/2025-07-01/provinces/${provCodeStr}/communes`);
                            const data = await res.json();
                            const distList: District[] = (data.communes || [])
                              .map((c: any) => ({ code: c.code, name: c.name.replace(/\n/g, "").trim() }))
                              .sort((a: District, b: District) => a.name.localeCompare(b.name, 'vi'));
                            setDistricts(distList);
                            currentDistricts = distList;
                          } catch (e) {
                            console.error("Lỗi fetch communes:", e);
                          }
                        }

                        // Tìm Phường/Xã (Quận/Huyện)
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
                            setValue("ward", "", { shouldValidate: true });
                          }
                        }
                      }
                    }}
                  />
                </div>
                <p className="theme-badge-warning mt-2 rounded-lg p-2.5 text-[11px] leading-relaxed">
                  ⚠️ <strong>Lưu ý:</strong> Bạn có thể kéo thả dấu mốc (Marker) hoặc click trực tiếp lên bản đồ trên để điều chỉnh vị trí mong muốn.
                </p>
              </>
            ) : null}

            {/* Mô tả chi tiết */}
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

            {/* Đặc trưng bất động sản */}
            {features.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-2">
                <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Đặc trưng bất động sản</label>
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
                                <span className="truncate">{feature.name}</span>
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
        </div>

        {/* CỘT PHẢI: Upload ảnh nằm ngang và nút đăng bài */}
        <div className="theme-post-form-shell flex min-h-0 flex-col p-5 lg:overflow-y-auto custom-scrollbar">
          <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--border)] pb-2">
            <h2 className="text-base font-semibold text-[var(--accent)]">Hình ảnh bất động sản</h2>
            <span className="theme-badge-info rounded-full px-2 py-0.5 text-xs font-medium">
              {imagePreviews.length}/{maxFiles} ảnh
            </span>
          </div>

          <div className="space-y-5 flex-1 flex flex-col min-h-0">
            {/* Dropzone upload */}
            <div className="theme-upload-zone shrink-0 rounded-2xl p-4 transition duration-300">
              <button
                type="button"
                onClick={openFilePicker}
                className="flex w-full flex-col items-center justify-center gap-2 py-4 text-[var(--secondary-foreground)] hover:text-[var(--foreground)]"
              >
                <Upload className="h-7 w-7 animate-bounce text-[var(--accent)]" />
                <span className="text-sm font-semibold">Tải ảnh lên tại đây</span>
                <span className="text-xs text-[var(--muted-foreground)]">Chấp nhận định dạng JPG, PNG, WEBP. Tối đa 5MB/ảnh</span>
              </button>
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleImageSelection(event.target.files);
                  event.target.value = "";
                  setFileInputKey((current) => current + 1);
                }}
              />
            </div>

            {imageError && (
              <p className="theme-badge-warning shrink-0 rounded-lg p-2.5 text-xs">
                {imageError}
              </p>
            )}

            {/* Vùng xem ảnh nằm ngang bên phải */}
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <span className="theme-post-helper mb-2 block shrink-0 text-xs font-medium">Danh sách ảnh đã tải lên (trượt ngang):</span>

              {imagePreviews.length > 0 ? (
                <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[160px] max-h-[220px]">
                  {imagePreviews.map((image, index) => {
                    const isAvatar = image.id === avatarImageId;
                    return (
                      <div
                        key={image.id}
                        className={`theme-upload-preview group relative shrink-0 w-36 aspect-[4/3] overflow-hidden rounded-xl border transition duration-300 ${isAvatar ? 'border-[var(--success-border)] ring-2 ring-[color:var(--success-border)] scale-[1.02]' : ''
                          }`}
                      >
                        <img
                          src={image.url}
                          alt={image.file.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Overlay đen bóng mờ khi hover */}
                        <div className="absolute inset-0 flex flex-col justify-between bg-[var(--overlay)] p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className="theme-button-danger-solid flex h-7 w-7 items-center justify-center rounded-full transition"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {!isAvatar && (
                            <button
                              type="button"
                              onClick={() => setAvatarImageId(image.id)}
                              className="theme-button-success w-full rounded-lg py-1 text-[10px] font-semibold transition"
                            >
                              Chọn làm đại diện
                            </button>
                          )}
                        </div>

                        {isAvatar ? (
                          <div className="theme-badge-success absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                            Ảnh đại diện
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 rounded-md bg-[var(--overlay-strong)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)] backdrop-blur-sm">
                            Ảnh #{index + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="theme-upload-preview flex flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center text-[var(--muted-foreground)]">
                  <ImagePlus className="mb-2 h-7 w-7 text-[var(--accent)]" />
                  <p className="text-xs">Chưa có hình ảnh nào được tải lên.</p>
                </div>
              )}
            </div>

            {/* Nút gửi bài viết cuối trang */}
            <div className="shrink-0 border-t border-[var(--border)] pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Đang xử lý và đăng tải dữ liệu...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Đăng bài ngay
                  </>
                )}
              </button>
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
      ` }} />
    </div>
  );
}
