"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

const createPostSchema = z.object({
  title: z.string().min(5, "Tieu de it nhat 5 ky tu"),
  description: z.string().min(10, "Mo ta it nhat 10 ky tu"),
  price: z.coerce.number().positive("Gia phai lon hon 0"),
  area: z.coerce.number().positive("Dien tich phai lon hon 0"),
  address: z.string().min(3, "Vui long nhap dia chi"),
  city: z.string().min(2, "Vui long nhap tinh / thanh"),
  district: z.string().min(2, "Vui long nhap quan / huyen"),
  ward: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
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

export default function CreatePostPage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
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
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormInput, unknown, CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      propertyType: "HOUSE",
      postType: "SELL",
    },
  });

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
        skippedCount > 0 ? `Chi duoc chon toi da ${maxFiles} anh. ${skippedCount} anh da bi bo qua.` : null,
      );
      return;
    }

    if (uploadableCount === 0) {
      if (oversizedCount > 0 && invalidTypeCount > 0) {
        setImageError("Tat ca anh vua chon deu vuot 5MB hoac khong dung dinh dang JPG, PNG, WEBP.");
      } else if (oversizedCount > 0) {
        setImageError("Tat ca anh vua chon deu vuot qua gioi han 5MB.");
      } else {
        setImageError("Tat ca anh vua chon deu khong dung dinh dang JPG, PNG, WEBP.");
      }
      return;
    }

    if (invalidTypeCount > 0 || oversizedCount > 0 || skippedCount > 0) {
      const messages = [
        invalidTypeCount > 0 ? `${invalidTypeCount} anh sai dinh dang` : null,
        oversizedCount > 0 ? `${oversizedCount} anh vuot 5MB` : null,
        skippedCount > 0 ? `${skippedCount} anh vuot gioi han ${maxFiles}` : null,
      ].filter(Boolean);

      setImageError(`Da them ${uploadableCount} anh hop le. ${messages.join(", ")}.`);
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
        setError("Khong co anh hop le de upload. Chi ho tro JPG, PNG, WEBP va moi anh toi da 5MB.");
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

      const response = await api.post("/posts", formData);

      const createdPostId = response.data.data.id as string | undefined;
      router.push(createdPostId ? `/posts/${createdPostId}` : "/posts");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Dang tin that bai");
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <div className="glass-card mx-auto max-w-4xl p-8">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-blue-300/80">Create Listing</p>
          <h1 className="text-3xl font-bold text-white">Dang tin moi</h1>
          <p className="mt-3 text-gray-400">
            Hoan thien thong tin co ban, them hinh anh va dang bai ngay tren TrustEstate.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-300">Tieu de</label>
              <input
                type="text"
                {...register("title")}
                className="input-dark"
                placeholder="Nha pho trung tam, phap ly ro rang"
              />
              {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-300">Mo ta</label>
              <textarea
                {...register("description")}
                className="input-dark min-h-36"
                placeholder="Mo ta chi tiet bat dong san, tien ich, tinh trang phap ly..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Gia</label>
              <input type="number" {...register("price")} className="input-dark" />
              {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Dien tich</label>
              <input type="number" {...register("area")} className="input-dark" />
              {errors.area && <p className="mt-1 text-sm text-red-400">{errors.area.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Loai bat dong san</label>
              <select {...register("propertyType")} className="input-dark">
                <option value="HOUSE">Nha</option>
                <option value="APARTMENT">Can ho</option>
                <option value="LAND">Dat</option>
                <option value="ROOM">Phong</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Nhu cau</label>
              <select {...register("postType")} className="input-dark">
                <option value="SELL">Ban</option>
                <option value="RENT">Cho thue</option>
                <option value="FIND">Can tim</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-300">Dia chi</label>
              <input type="text" {...register("address")} className="input-dark" />
              {errors.address && <p className="mt-1 text-sm text-red-400">{errors.address.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Tinh / thanh</label>
              <input type="text" {...register("city")} className="input-dark" />
              {errors.city && <p className="mt-1 text-sm text-red-400">{errors.city.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Quan / huyen</label>
              <input type="text" {...register("district")} className="input-dark" />
              {errors.district && (
                <p className="mt-1 text-sm text-red-400">{errors.district.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-300">Phuong / xa</label>
              <input type="text" {...register("ward")} className="input-dark" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Vi do</label>
              <input type="number" step="any" {...register("latitude")} className="input-dark" />
              {errors.latitude && (
                <p className="mt-1 text-sm text-red-400">{errors.latitude.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Kinh do</label>
              <input type="number" step="any" {...register("longitude")} className="input-dark" />
              {errors.longitude && (
                <p className="mt-1 text-sm text-red-400">{errors.longitude.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Hinh anh bai dang</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Chon toi da 10 anh. Anh se duoc preview truoc khi upload.
                </p>
              </div>
              <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                {imagePreviews.length}/{maxFiles} anh
              </span>
            </div>

            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-5">
              <button
                type="button"
                onClick={openFilePicker}
                className="flex w-full items-center justify-center gap-3 text-gray-200 transition hover:text-white"
              >
                <Upload className="h-5 w-5 text-blue-300" />
                <span>Chon nhieu anh de upload</span>
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

            {imageError && <p className="mt-3 text-sm text-amber-300">{imageError}</p>}

            {imagePreviews.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {imagePreviews.map((image, index) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                    <div className="relative aspect-[4/3]">
                      <img src={image.url} alt={image.file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white transition hover:bg-red-500/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-3 text-sm text-gray-300">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{image.file.name}</p>
                        <p className="mt-1 text-xs text-gray-400">Anh #{index + 1}</p>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(image.id)}
                          className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-200 transition hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/30 text-center text-gray-400">
                <ImagePlus className="mb-3 h-8 w-8 text-blue-300" />
                Chua co anh nao duoc chon.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Dang upload va tao bai dang...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Dang tin
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
