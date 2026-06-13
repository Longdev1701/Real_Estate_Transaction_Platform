import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  checkPostLikeController,
  likePostController,
  unlikePostController,
} from "./post-like.controller.js";
import { postLikeBodySchema, postLikeParamSchema } from "./post-like.validation.js";

export const postLikeRoutes = Router();

postLikeRoutes.use(authenticate);

postLikeRoutes.get(
  "/check/:postId",
  validateRequest({ params: postLikeParamSchema }),
  checkPostLikeController,
);
postLikeRoutes.post(
  "/",
  validateRequest({ body: postLikeBodySchema }),
  likePostController,
);
postLikeRoutes.delete(
  "/:postId",
  validateRequest({ params: postLikeParamSchema }),
  unlikePostController,
);
