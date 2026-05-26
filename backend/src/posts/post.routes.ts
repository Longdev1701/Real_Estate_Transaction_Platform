import type { RequestHandler } from "express";

import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  createPostController,
  deletePostController,
  getPostByIdController,
  getPostsController,
  updatePostController,
} from "./post.controller.js";
import {
  createPostSchema,
  postFilterSchema,
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
postRoutes.delete(
  "/:id",
  authenticate,
  validateRequest({ params: postIdParamSchema }),
  deletePostController,
);
