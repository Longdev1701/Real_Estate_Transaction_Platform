"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { api } from "@/lib/api";

const createPostSchema = z.object({
  title: z.string().min(5, "Tiêu đề ít nhất 5 ký tự"),
  description: z.string().min(10, "Mô tả ít nhất 10 ký tự"),
  price: z.coerce.number().positive("Giá phải lớn hơn 0"),
  area: z.coerce.number().positive("Diện tích phải lớn hơn 0"),
  address: z.string().min(3, "Vui lòng nhập địa chỉ"),
  city: z.string().min(2, "Vui lòng nhập tỉnh/thành"),
  district: z.string().min(2, "Vui lòng nhập quận/huyện"),
  ward: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  propertyType: z.enum(["HOUSE", "APARTMENT", "LAND", "ROOM"]),
  postType: z.enum(["SELL", "RENT", "FIND"]),
});

type CreatePostFormInput = z.input<typeof createPostSchema>;
type CreatePostFormValues = z.output<typeof createPostSchema>;

export default function CreatePostPage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, user, router]);

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

  const onSubmit = async (data: CreatePostFormValues) => {
    try {
      setError(null);

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formData.append(key, String(value));
        }
      });
      images.forEach((image) => formData.append("images", image));

      await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      router.push("/posts");
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đăng tin thất bại");
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="glass-card p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Đăng tin mới</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tiêu đề
            </label>
            <input
              type="text"
              {...register("title")}
              className="input-dark"
              placeholder="Nhà phố trung tâm, pháp lý rõ ràng"
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mô tả
            </label>
            <textarea
              {...register("description")}
              className="input-dark min-h-32"
              placeholder="Mô tả chi tiết bất động sản..."
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Giá
              </label>
              <input type="number" {...register("price")} className="input-dark" />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Diện tích
              </label>
              <input type="number" {...register("area")} className="input-dark" />
              {errors.area && (
                <p className="text-red-400 text-sm mt-1">{errors.area.message}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Loại bất động sản
              </label>
              <select {...register("propertyType")} className="input-dark">
                <option value="HOUSE">Nhà</option>
                <option value="APARTMENT">Căn hộ</option>
                <option value="LAND">Đất</option>
                <option value="ROOM">Phòng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nhu cầu
              </label>
              <select {...register("postType")} className="input-dark">
                <option value="SELL">Bán</option>
                <option value="RENT">Cho thuê</option>
                <option value="FIND">Tìm mua/thuê</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Địa chỉ
            </label>
            <input type="text" {...register("address")} className="input-dark" />
            {errors.address && (
              <p className="text-red-400 text-sm mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tỉnh/Thành
              </label>
              <input type="text" {...register("city")} className="input-dark" />
              {errors.city && (
                <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quận/Huyện
              </label>
              <input type="text" {...register("district")} className="input-dark" />
              {errors.district && (
                <p className="text-red-400 text-sm mt-1">{errors.district.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phường/Xã
              </label>
              <input type="text" {...register("ward")} className="input-dark" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Vĩ độ
              </label>
              <input type="number" step="any" {...register("latitude")} className="input-dark" />
              {errors.latitude && (
                <p className="text-red-400 text-sm mt-1">{errors.latitude.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Kinh độ
              </label>
              <input type="number" step="any" {...register("longitude")} className="input-dark" />
              {errors.longitude && (
                <p className="text-red-400 text-sm mt-1">{errors.longitude.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hình ảnh
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="input-dark"
              onChange={(event) => {
                setImages(Array.from(event.target.files ?? []).slice(0, 10));
              }}
            />
            {images.length > 0 && (
              <p className="text-gray-400 text-sm mt-2">{images.length} ảnh đã chọn</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 mt-4 flex justify-center items-center"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng tin"}
          </button>
        </form>
      </div>
    </div>
  );
}
