import type { RequestHandler } from "express";

import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { postImagesField } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  addPostImagesController,
  createPostController,
  deletePostController,
  deletePostImageController,
  getPostByIdController,
  getPostsController,
  updatePostController,
} from "./post.controller.js";
import {
  createPostSchema,
  imageMetadataSchema,
  postFilterSchema,
  postImageParamSchema,
  postIdParamSchema,
  updatePostSchema,
} from "./post.validation.js";

export const postRoutes = Router();

const optionalAuthenticate: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }

  authenticate(req, res, next);
};

postRoutes.post(
  "/",
  authenticate,
  postImagesField,
  validateRequest({ body: createPostSchema }),
  createPostController,
);
postRoutes.get(
  "/",
  optionalAuthenticate,
  validateRequest({ query: postFilterSchema }),
  getPostsController,
);
postRoutes.get(
  "/:id",
  optionalAuthenticate,
  validateRequest({ params: postIdParamSchema }),
  getPostByIdController,
);
postRoutes.patch(
  "/:id",
  authenticate,
  validateRequest({ params: postIdParamSchema, body: updatePostSchema }),
  updatePostController,
);
postRoutes.post(
  "/:id/images",
  authenticate,
  postImagesField,
  validateRequest({ params: postIdParamSchema, body: imageMetadataSchema }),
  addPostImagesController,
);
postRoutes.delete(
  "/:id/images/:imageId",
  authenticate,
  validateRequest({ params: postImageParamSchema }),
  deletePostImageController,
);
postRoutes.delete(
  "/:id",
  authenticate,
  validateRequest({ params: postIdParamSchema }),
  deletePostController,
);
