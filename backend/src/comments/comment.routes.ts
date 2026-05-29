import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  createCommentController,
  deleteCommentController,
  getCommentsController,
} from "./comment.controller.js";
import {
  commentIdParamSchema,
  createCommentSchema,
  getCommentsQuerySchema,
} from "./comment.validation.js";

export const commentRoutes = Router();

// GET is public so anyone can view comments
commentRoutes.get(
  "/",
  validateRequest({ query: getCommentsQuerySchema }),
  getCommentsController,
);

// POST requires authentication to create comments
commentRoutes.post(
  "/",
  authenticate,
  validateRequest({ body: createCommentSchema }),
  createCommentController,
);

// DELETE requires authentication to delete comments
commentRoutes.delete(
  "/:id",
  authenticate,
  validateRequest({ params: commentIdParamSchema }),
  deleteCommentController,
);
