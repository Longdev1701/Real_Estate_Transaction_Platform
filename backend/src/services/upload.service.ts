import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import type { Express } from "express";

import { getSupabaseClient, propertyImagesBucket } from "../config/supabase.js";
import { AppError } from "../middlewares/error.middleware.js";

type ImageMetadataInput = {
  caption?: string;
  order?: number;
};

const storageOperationTimeoutMs = Number(
  process.env.SUPABASE_STORAGE_TIMEOUT_MS ?? 30_000,
);

const withStorageTimeout = async <T>(
  operation: Promise<T>,
  timeoutMessage: string,
) => {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new AppError(timeoutMessage, 504));
        }, storageOperationTimeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const contentTypeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/heic": ".heic",
  "image/heif": ".heif",
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
  const uploadedPaths: string[] = [];

  try {
    const uploadPromises = files.map(async (file, index) => {
      const storagePath = buildStoragePath(postId, file);
      const { error } = await withStorageTimeout(
        getSupabaseClient().storage
          .from(propertyImagesBucket)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          }),
        "Upload image timed out. Please try again.",
      );

      if (error) {
        throw new AppError("Failed to upload image to Supabase Storage.", 500, {
          cause: error.message,
        });
      }

      uploadedPaths.push(storagePath);

      return {
        imageUrl: getPublicUrl(storagePath),
        caption: imageMetadata[index]?.caption,
        order: imageMetadata[index]?.order ?? index,
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);
    return uploadedImages;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await Promise.allSettled(
        uploadedPaths.map((path) =>
          getSupabaseClient().storage.from(propertyImagesBucket).remove([path])
        )
      );
    }
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
  const { error } = await withStorageTimeout(
    getSupabaseClient().storage
      .from(propertyImagesBucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      }),
    "Upload image timed out. Please try again.",
  );

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
  const { error } = await withStorageTimeout(
    getSupabaseClient().storage
      .from(propertyImagesBucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      }),
    "Upload avatar image timed out. Please try again.",
  );

  if (error) {
    throw new AppError("Failed to upload avatar image to Supabase Storage.", 500, {
      cause: error.message,
    });
  }

  return getPublicUrl(storagePath);
};

export const deleteImageByUrl = async (imageUrl: string) => {
  const storagePath = getStoragePathFromPublicUrl(imageUrl);
  const { error } = await withStorageTimeout(
    getSupabaseClient().storage
      .from(propertyImagesBucket)
      .remove([storagePath]),
    "Delete image timed out. Please try again.",
  );

  if (error) {
    throw new AppError("Failed to delete image from Supabase Storage.", 500, {
      cause: error.message,
    });
  }
};
