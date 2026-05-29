"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ImagePlus, LoaderCircle, Trash2, Upload, MapPin, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { api } from "@/lib/api";
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
  propertyType: z.enum(["HOUSE", "APARTMENT", "LAND", "ROOM"]),
  postType: z.enum(["SELL", "RENT", "FIND"]),
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
    <div className="h-[220px] bg-slate-950/40 flex items-center justify-center text-xs text-gray-400 rounded-xl border border-white/10 mt-2">
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

  // States cho Tỉnh/Huyện/Xã
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
  }, [register]);

  const watchAllFields = watch();
  const city = watch("city");
  const district = watch("district");
  const ward = watch("ward");
  const address = watch("address");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  // Load provinces and draft on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const pRes = await fetch("https://provinces.open-api.vn/api/p/");
        const pData: Province[] = await pRes.json();
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
              
              if (parsed.district) {
                const dRes = await fetch(`https://provinces.open-api.vn/api/p/${matchProv.code}?depth=2`);
                const dData = await dRes.json();
                const distList: District[] = dData.districts || [];
                setDistricts(distList);
                
                const matchDist = distList.find((d) => d.name === parsed.district);
                if (matchDist) {
                  setSelDistrictCode(String(matchDist.code));
                  
                  if (parsed.ward) {
                    const wRes = await fetch(`https://provinces.open-api.vn/api/d/${matchDist.code}?depth=2`);
                    const wData = await wRes.json();
                    setWards(wData.wards || []);
                  }
                }
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1`,
          {
            headers: {
              "Accept-Language": "vi",
            },
          }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          setValue("latitude", parseFloat(data[0].lat));
          setValue("longitude", parseFloat(data[0].lon));
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
      
      // Fetch các quận huyện
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
        const data = await res.json();
        setDistricts(data.districts || []);
      } catch (err) {
        console.error("Lỗi tải danh sách quận huyện:", err);
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
      
      // Fetch các phường xã
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
        const data = await res.json();
        setWards(data.wards || []);
      } catch (err) {
        console.error("Lỗi tải danh sách phường xã:", err);
      }
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

  const handleImageSelection = (files: FileList | null) => {
    if (!files) {
      return;
    }

    setImageError(null);
    const incomingFiles = Array.from(files);

    setImagePreviews((currentImages) => {
      const remainingSlots = Math.max(0, maxFiles - currentImages.length);
      const filesToAppend = incomingFiles.slice(0, remainingSlots);
      const nextPreviews = filesToAppend.map((file) => {
        const validation = getImageValidation(file);

        return {
          file,
          url: URL.createObjectURL(file),
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          isMimeValid: validation.isMimeValid,
          isExtensionValid: validation.isExtensionValid,
          isSizeValid: validation.isSizeValid,
        };
      });

      return [...currentImages, ...nextPreviews];
    });

    const appendedFiles = incomingFiles.slice(0, maxFiles - imagePreviews.length);
    const skippedCount = Math.max(0, incomingFiles.length - appendedFiles.length);
    const uploadableCount = appendedFiles.filter((file) => getImageValidation(file).isUploadable).length;
    const invalidTypeCount = appendedFiles.filter((file) => {
      const validation = getImageValidation(file);
      return !validation.isMimeValid && !validation.isExtensionValid;
    }).length;
    const oversizedCount = appendedFiles.filter((file) => !getImageValidation(file).isSizeValid).length;

    if (appendedFiles.length === 0) {
      setImageError(
        skippedCount > 0 ? `Chỉ được chọn tối đa ${maxFiles} ảnh. ${skippedCount} ảnh đã bị bỏ qua.` : null,
      );
      return;
    }

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
        <div className="fixed right-6 top-20 z-50 flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-slate-900/90 px-4 py-3 text-sm text-blue-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <Save className="h-4 w-4 text-blue-400" />
          <span>Đã tự động khôi phục thông tin bài đăng nháp của bạn!</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Đăng bài mới</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Điền các thông tin mô tả chi tiết, vị trí và tải ảnh lên trực quan.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 font-medium">
          Tài khoản: {user.fullName}
        </span>
      </div>

      {error && (
        <div className="mb-4 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Grid ngang 2 phần, nằm trọn trên 1 page trên desktop */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.3fr_1fr] min-h-0 flex-1 overflow-hidden">
        
        {/* CỘT TRÁI: Bảng nhập thông tin */}
        <div className="glass-card flex flex-col min-h-0 p-5 lg:overflow-y-auto custom-scrollbar">
          <h2 className="text-base font-semibold text-blue-300 border-b border-white/10 pb-2 mb-4 shrink-0">Thông tin chi tiết</h2>
          
          <div className="space-y-4 flex-1 pr-1">
            {/* Tiêu đề */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Tiêu đề bài đăng <span className="text-red-400">*</span></label>
              <input
                type="text"
                {...register("title")}
                className="input-dark py-2 text-sm"
                placeholder="Ví dụ: Căn hộ cao cấp 2PN view sông Quận 7"
              />
              {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
            </div>

            {/* Loại & Nhu cầu */}
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Loại hình bất động sản</label>
                <select {...register("propertyType")} className="input-dark py-2 text-sm">
                  <option value="HOUSE">Nhà riêng</option>
                  <option value="APARTMENT">Căn hộ / Chung cư</option>
                  <option value="LAND">Đất nền</option>
                  <option value="ROOM">Phòng trọ</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Nhu cầu đăng bài</label>
                <select {...register("postType")} className="input-dark py-2 text-sm">
                  <option value="SELL">Bán</option>
                  <option value="RENT">Cho thuê</option>
                  <option value="FIND">Cần tìm mua/thuê</option>
                </select>
              </div>
            </div>

            {/* Giá & Diện tích */}
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Giá bán / thuê (VND) <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  {...register("price")} 
                  placeholder="Ví dụ: 1500000000"
                  className="input-dark py-2 text-sm" 
                />
                {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Diện tích (m²) <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  step="any"
                  {...register("area")} 
                  placeholder="Ví dụ: 75"
                  className="input-dark py-2 text-sm" 
                />
                {errors.area && <p className="mt-1 text-xs text-red-400">{errors.area.message}</p>}
              </div>
            </div>

            {/* Khu vực chọn cấp bậc */}
            <div className="grid gap-3 grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Tỉnh / Thành phố <span className="text-red-400">*</span></label>
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
                {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Quận / Huyện <span className="text-red-400">*</span></label>
                <select
                  value={selDistrictCode}
                  onChange={handleDistrictChange}
                  disabled={!selProvinceCode}
                  className="input-dark py-2 text-sm disabled:opacity-50"
                >
                  <option value="">-- Chọn Quận / Huyện --</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.district && <p className="mt-1 text-xs text-red-400">{errors.district.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Phường / Xã</label>
                <select
                  value={ward || ""}
                  onChange={handleWardChange}
                  disabled={!selDistrictCode}
                  className="input-dark py-2 text-sm disabled:opacity-50"
                >
                  <option value="">-- Chọn Phường / Xã --</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Địa chỉ cụ thể */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Địa chỉ cụ thể <span className="text-red-400">*</span></label>
              <input
                type="text"
                {...register("address")}
                onBlur={handleAddressBlur}
                className="input-dark py-2 text-sm"
                placeholder="Ví dụ: Số 105 Đường Nguyễn Văn Linh"
              />
              {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address.message}</p>}
            </div>

            {/* Tọa độ Map */}
            <div className="grid gap-4 grid-cols-[1fr_1fr_auto] items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Vĩ độ (Lat)</label>
                <input
                  type="number"
                  step="any"
                  {...register("latitude")}
                  className="input-dark py-2 text-sm bg-slate-950/20"
                />
                {errors.latitude && <p className="mt-1 text-xs text-red-400">{errors.latitude.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Kinh độ (Lng)</label>
                <input
                  type="number"
                  step="any"
                  {...register("longitude")}
                  className="input-dark py-2 text-sm bg-slate-950/20"
                />
                {errors.longitude && <p className="mt-1 text-xs text-red-400">{errors.longitude.message}</p>}
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
              <p className="text-xs text-emerald-400 flex items-center gap-1 mt-[-8px]">
                <Check className="h-3.5 w-3.5" /> Đã lấy tọa độ bản đồ tự động dựa vào địa chỉ của bạn!
              </p>
            )}
            {geocodeStatus === "failed" && (
              <p className="text-xs text-amber-400 mt-[-8px]">
                Không tìm thấy tọa độ cụ thể. Hãy kiểm tra lại địa chỉ hoặc tự nhập tay.
              </p>
            )}

            {/* Bản đồ xem trước */}
            {latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0 ? (
              <>
                <div className="rounded-xl overflow-hidden border border-white/10 h-[220px] w-full shrink-0 relative mt-2 shadow-lg">
                  <CreatePostMap
                    latitude={Number(latitude)}
                    longitude={Number(longitude)}
                    onChange={(lat, lng) => {
                      setValue("latitude", lat, { shouldValidate: true });
                      setValue("longitude", lng, { shouldValidate: true });
                    }}
                  />
                </div>
                <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-2">
                  ⚠️ <strong>Lưu ý:</strong> Bạn có thể kéo thả dấu mốc (Marker) hoặc click trực tiếp lên bản đồ trên để điều chỉnh vị trí mong muốn.
                </p>
              </>
            ) : null}

            {/* Mô tả chi tiết */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Mô tả bài đăng <span className="text-red-400">*</span></label>
              <textarea
                {...register("description")}
                className="input-dark min-h-[90px] text-sm"
                placeholder="Mô tả chi tiết về bất động sản (pháp lý, hướng nhà, tiện ích xung quanh, tình trạng nội thất...)"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Upload ảnh nằm ngang và nút đăng bài */}
        <div className="glass-card flex flex-col min-h-0 p-5 lg:overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4 shrink-0">
            <h2 className="text-base font-semibold text-blue-300">Hình ảnh bất động sản</h2>
            <span className="text-xs font-medium text-blue-200 border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {imagePreviews.length}/{maxFiles} ảnh
            </span>
          </div>

          <div className="space-y-5 flex-1 flex flex-col min-h-0">
            {/* Dropzone upload */}
            <div className="shrink-0 rounded-2xl border-2 border-dashed border-white/15 bg-slate-950/40 p-4 transition duration-300 hover:border-blue-500/40 hover:bg-slate-950/60">
              <button
                type="button"
                onClick={openFilePicker}
                className="flex flex-col items-center justify-center gap-2 w-full py-4 text-gray-300 hover:text-white"
              >
                <Upload className="h-7 w-7 text-blue-400 animate-bounce" />
                <span className="text-sm font-semibold">Tải ảnh lên tại đây</span>
                <span className="text-xs text-gray-500">Chấp nhận định dạng JPG, PNG, WEBP. Tối đa 5MB/ảnh</span>
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
              <p className="shrink-0 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                {imageError}
              </p>
            )}

            {/* Vùng xem ảnh nằm ngang bên phải */}
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <span className="text-xs font-medium text-gray-400 mb-2 block shrink-0">Danh sách ảnh đã tải lên (trượt ngang):</span>
              
              {imagePreviews.length > 0 ? (
                <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar min-h-[160px] max-h-[220px]">
                  {imagePreviews.map((image, index) => {
                    const isAvatar = image.id === avatarImageId;
                    return (
                      <div 
                        key={image.id} 
                        className={`relative shrink-0 w-36 aspect-[4/3] rounded-xl overflow-hidden border transition duration-300 bg-slate-950/60 group shadow-lg ${
                          isAvatar ? 'border-emerald-500 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-white/10'
                        }`}
                      >
                        <img 
                          src={image.url} 
                          alt={image.file.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        
                        {/* Overlay đen bóng mờ khi hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className="h-7 w-7 rounded-full bg-red-600/95 text-white flex items-center justify-center hover:bg-red-600 transition shadow-md"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          {!isAvatar && (
                            <button
                              type="button"
                              onClick={() => setAvatarImageId(image.id)}
                              className="w-full py-1 text-[10px] font-semibold bg-emerald-600/90 text-white rounded-lg hover:bg-emerald-500 transition shadow-md"
                            >
                              Chọn làm đại diện
                            </button>
                          )}
                        </div>

                        {isAvatar ? (
                          <div className="absolute left-2 bottom-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md">
                            Ảnh đại diện
                          </div>
                        ) : (
                          <div className="absolute left-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-blue-300 backdrop-blur-sm">
                            Ảnh #{index + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/20 p-6 text-center text-gray-400">
                  <ImagePlus className="mb-2 h-7 w-7 text-blue-300" />
                  <p className="text-xs">Chưa có hình ảnh nào được tải lên.</p>
                </div>
              )}
            </div>

            {/* Nút gửi bài viết cuối trang */}
            <div className="pt-4 border-t border-white/10 shrink-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-75 shadow-lg shadow-blue-500/20"
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
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      ` }} />
    </div>
  );
}
