import { PostStatus, PostType, PropertyType } from "@prisma/client";
import { z } from "zod";

const postTypeValues = Object.values(PostType) as [PostType, ...PostType[]];
const propertyTypeValues = Object.values(PropertyType) as [
  PropertyType,
  ...PropertyType[],
];
const postStatusValues = Object.values(PostStatus) as [
  PostStatus,
  ...PostStatus[],
];

const optionalNumberSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().nonnegative().optional(),
);

const imageSchema = z.object({
  imageUrl: z.url("Image URL must be valid."),
  caption: z.string().max(255).optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export const createPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long."),
  price: z.coerce.number().positive("Price must be greater than 0."),
  area: z.coerce.number().positive("Area must be greater than 0."),
  address: z.string().min(3, "Address is required."),
  city: z.string().min(2, "City is required."),
  district: z.string().min(2, "District is required."),
  ward: z.string().min(1).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  propertyType: z.enum(propertyTypeValues),
  postType: z.enum(postTypeValues),
  images: z.array(imageSchema).optional(),
});

export const updatePostSchema = createPostSchema
  .partial()
  .extend({
    status: z.enum(postStatusValues).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update.",
  });

export const postFilterSchema = z
  .object({
    keyword: z.string().trim().optional(),
    city: z.string().trim().optional(),
    district: z.string().trim().optional(),
    postType: z.enum(postTypeValues).optional(),
    propertyType: z.enum(propertyTypeValues).optional(),
    status: z.enum(postStatusValues).optional(),
    minPrice: optionalNumberSchema,
    maxPrice: optionalNumberSchema,
    minArea: optionalNumberSchema,
    maxArea: optionalNumberSchema,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice.",
      path: ["minPrice"],
    },
  )
  .refine(
    (data) =>
      data.minArea === undefined ||
      data.maxArea === undefined ||
      data.minArea <= data.maxArea,
    {
      message: "minArea must be less than or equal to maxArea.",
      path: ["minArea"],
    },
  );

export const postIdParamSchema = z.object({
  id: z.string().min(1, "Post id is required."),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostFilterInput = z.infer<typeof postFilterSchema>;
