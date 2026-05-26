import multer from "multer";

import { AppError } from "./error.middleware.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSizeInBytes = 5 * 1024 * 1024;
const maxFiles = 10;

export const postImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeInBytes,
    files: maxFiles,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError("Only JPEG, PNG, and WEBP images are allowed.", 400),
      );
      return;
    }

    callback(null, true);
  },
});

export const postImagesField = postImageUpload.array("images", maxFiles);
