import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import { createComment, deleteComment, getComments } from "./comment.service.js";

export const createCommentController: RequestHandler = async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const { postId, content, parentId } = req.body;
    const result = await createComment(postId, actor.id, content, parentId);

    sendSuccess(res, result, "Comment created successfully.", 201);
  } catch (error) {
    next(error);
  }
};

export const getCommentsController: RequestHandler = async (req, res, next) => {
  try {
    const postId = req.query.postId as string;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const result = await getComments(postId, page, limit);

    sendSuccess(res, result, "Comments fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const deleteCommentController: RequestHandler = async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const idParam = req.params.id;
    const commentId = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!commentId) {
      res.status(400).json({ message: "Comment id is required." });
      return;
    }

    const result = await deleteComment(commentId, actor.id, actor.role);

    sendSuccess(res, result, "Comment deleted successfully.");
  } catch (error) {
    next(error);
  }
};
