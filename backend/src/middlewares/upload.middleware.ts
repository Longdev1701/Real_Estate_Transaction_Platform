import multer from "multer";
import { extname } from "node:path";

import { AppError } from "./error.middleware.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/pjpeg",
]);
const maxFileSizeInBytes = 5 * 1024 * 1024;
const maxFiles = 10;
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const postImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeInBytes,
    files: maxFiles,
  },
  fileFilter: (_req, file, callback) => {
    const fileExtension = extname(file.originalname).toLowerCase();
    const isMimeAllowed = allowedMimeTypes.has(file.mimetype);
    const isExtensionAllowed = allowedExtensions.has(fileExtension);

    if (!isMimeAllowed && !isExtensionAllowed) {
      callback(
        new AppError("Only JPEG, PNG, and WEBP images are allowed.", 400),
      );
      return;
    }

    callback(null, true);
  },
});

export const postImagesField = postImageUpload.array("images", maxFiles);
