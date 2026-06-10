import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import type { Express } from "express";

import { getSupabaseClient, propertyImagesBucket } from "../config/supabase.js";
import { AppError } from "../middlewares/error.middleware.js";

type ImageMetadataInput = {
  caption?: string;
  order?: number;
};

const contentTypeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const getFileExtension = (file: Express.Multer.File) => {
  const originalExtension = extname(file.originalname).toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  return contentTypeToExtension[file.mimetype] ?? ".bin";
};

const buildStoragePath = (postId: string, file: Express.Multer.File) =>
  `posts/${postId}/${Date.now()}-${randomUUID()}${getFileExtension(file)}`;

const getPublicUrl = (storagePath: string) => {
  const { data } = getSupabaseClient().storage
    .from(propertyImagesBucket)
    .getPublicUrl(storagePath);

  return data.publicUrl;
};

const getStoragePathFromPublicUrl = (imageUrl: string) => {
  const marker = `/storage/v1/object/public/${propertyImagesBucket}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    throw new AppError("Invalid Supabase public image URL.", 400);
  }

  return imageUrl.slice(markerIndex + marker.length);
};

export const isManagedImageUrl = (imageUrl: string) =>
  imageUrl.includes(`/storage/v1/object/public/${propertyImagesBucket}/`);

export const uploadPostImages = async (
  postId: string,
  files: Express.Multer.File[],
  imageMetadata: ImageMetadataInput[] = [],
) => {
  const uploadedImages: Array<{
    imageUrl: string;
    caption?: string;
    order: number;
  }> = [];

  try {
    for (const [index, file] of files.entries()) {
      const storagePath = buildStoragePath(postId, file);
      const { error } = await getSupabaseClient().storage
        .from(propertyImagesBucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new AppError("Failed to upload image to Supabase Storage.", 500, {
          cause: error.message,
        });
      }

      uploadedImages.push({
        imageUrl: getPublicUrl(storagePath),
        caption: imageMetadata[index]?.caption,
        order: imageMetadata[index]?.order ?? index,
      });
    }

    return uploadedImages;
  } catch (error) {
    await Promise.allSettled(
      uploadedImages.map((image) => deleteImageByUrl(image.imageUrl)),
    );
    throw error;
  }
};

const buildChatStoragePath = (conversationId: string, file: Express.Multer.File) =>
  `chat-images/${conversationId}/${Date.now()}-${randomUUID()}${getFileExtension(file)}`;

export const uploadChatImage = async (
  conversationId: string,
  file: Express.Multer.File,
) => {
  const storagePath = buildChatStoragePath(conversationId, file);
  const { error } = await getSupabaseClient().storage
    .from(propertyImagesBucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new AppError("Failed to upload image to Supabase Storage.", 500, {
      cause: error.message,
    });
  }

  return getPublicUrl(storagePath);
};

const buildAvatarStoragePath = (userId: string, file: Express.Multer.File) =>
  `avatars/${userId}/${Date.now()}-${randomUUID()}${getFileExtension(file)}`;

export const uploadAvatarImage = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const storagePath = buildAvatarStoragePath(userId, file);
  const { error } = await getSupabaseClient().storage
    .from(propertyImagesBucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new AppError("Failed to upload avatar image to Supabase Storage.", 500, {
      cause: error.message,
    });
  }

  return getPublicUrl(storagePath);
};

export const deleteImageByUrl = async (imageUrl: string) => {
  const storagePath = getStoragePathFromPublicUrl(imageUrl);
  const { error } = await getSupabaseClient().storage
    .from(propertyImagesBucket)
    .remove([storagePath]);

  if (error) {
    throw new AppError("Failed to delete image from Supabase Storage.", 500, {
      cause: error.message,
    });
  }
};
