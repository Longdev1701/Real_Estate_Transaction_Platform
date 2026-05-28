import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  bulkUnsavePostsController,
  checkSavedPostController,
  getSavedPostsController,
  savePostController,
  unsavePostController,
} from "./saved-post.controller.js";
import {
  bulkSavedPostBodySchema,
  savedPostBodySchema,
  savedPostParamSchema,
} from "./saved-post.validation.js";

export const savedPostRoutes = Router();

savedPostRoutes.use(authenticate);

savedPostRoutes.get("/", getSavedPostsController);
savedPostRoutes.get(
  "/check/:postId",
  validateRequest({ params: savedPostParamSchema }),
  checkSavedPostController,
);
savedPostRoutes.post(
  "/",
  validateRequest({ body: savedPostBodySchema }),
  savePostController,
);
savedPostRoutes.post(
  "/bulk-remove",
  validateRequest({ body: bulkSavedPostBodySchema }),
  bulkUnsavePostsController,
);
savedPostRoutes.delete(
  "/:postId",
  validateRequest({ params: savedPostParamSchema }),
  unsavePostController,
);
