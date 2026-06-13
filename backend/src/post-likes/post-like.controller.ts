import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import { checkPostLike, likePost, unlikePost } from "./post-like.service.js";

const getPostIdParam = (postId: string | string[]) =>
  Array.isArray(postId) ? postId[0] : postId;

export const likePostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await likePost(req.body.postId, req.user);

    sendSuccess(res, result, "Post liked successfully.", 201);
  } catch (error) {
    next(error);
  }
};

export const unlikePostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await unlikePost(getPostIdParam(req.params.postId), req.user);

    sendSuccess(res, result, "Post unliked successfully.");
  } catch (error) {
    next(error);
  }
};

export const checkPostLikeController: RequestHandler = async (req, res, next) => {
  try {
    const result = await checkPostLike(getPostIdParam(req.params.postId), req.user);

    sendSuccess(res, result, "Post like status fetched successfully.");
  } catch (error) {
    next(error);
  }
};
