import type { FieldPath, FieldValues, UseFormSetValue } from "react-hook-form";

import type { Post } from "@/lib/posts";

export type PropertyFeature = {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
};

export const acceptedPropertyImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
export const acceptedPropertyImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/pjpeg",
]);
export const acceptedPropertyImageInput = "image/jpeg,image/png,image/webp,image/jpg";
export const maxPropertyImageSizeInBytes = 5 * 1024 * 1024;
export const maxPropertyImageCount = 10;

export const getFileExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex).toLowerCase();
};

export const getPropertyImageValidation = (file: File) => {
  const extension = getFileExtension(file.name);
  const isMimeValid = acceptedPropertyImageMimeTypes.has(file.type);
  const isExtensionValid = acceptedPropertyImageExtensions.has(extension);
  const isSizeValid = file.size <= maxPropertyImageSizeInBytes;

  return {
    isMimeValid,
    isExtensionValid,
    isSizeValid,
    isUploadable: isSizeValid && (isMimeValid || isExtensionValid),
  };
};

const postDraftFieldNames = [
  "title",
  "description",
  "price",
  "area",
  "address",
  "city",
  "district",
  "ward",
  "latitude",
  "longitude",
  "propertyType",
  "postType",
] as const;

export type PostDraftFieldName = (typeof postDraftFieldNames)[number];

export const applyPostDraftValues = <TFieldValues extends FieldValues>(
  values: Partial<Record<PostDraftFieldName, unknown>>,
  setValue: UseFormSetValue<TFieldValues>,
) => {
  postDraftFieldNames.forEach((fieldName) => {
    const value = values[fieldName];

    if (value !== undefined && value !== null && value !== "") {
      setValue(fieldName as FieldPath<TFieldValues>, value as TFieldValues[FieldPath<TFieldValues>]);
    }
  });
};

export const extractPostFeatureIds = (post: Pick<Post, "features">) =>
  post.features.map((feature) => feature.id);

export const buildVietnamGeocodeQueries = ({
  address,
  ward,
  district,
  city,
}: {
  address?: string;
  ward?: string;
  district?: string;
  city?: string;
}) => [
  [address, ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
  [ward, district, city, "Việt Nam"].filter(Boolean).join(", "),
  [district, city, "Việt Nam"].filter(Boolean).join(", "),
  [city, "Việt Nam"].filter(Boolean).join(", "),
];
