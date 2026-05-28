import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import {
  bulkUnsavePosts,
  checkSavedPost,
  getSavedPosts,
  savePost,
  unsavePost,
} from "./saved-post.service.js";

const getPostIdParam = (postId: string | string[]) =>
  Array.isArray(postId) ? postId[0] : postId;

export const savePostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await savePost(req.body.postId, req.user);

    sendSuccess(res, result, "Post saved successfully.", 201);
  } catch (error) {
    next(error);
  }
};

export const unsavePostController: RequestHandler = async (req, res, next) => {
  try {
    await unsavePost(getPostIdParam(req.params.postId), req.user);

    sendSuccess(res, null, "Post removed from saved list successfully.");
  } catch (error) {
    next(error);
  }
};

export const bulkUnsavePostsController: RequestHandler = async (req, res, next) => {
  try {
    const result = await bulkUnsavePosts(req.body.postIds, req.user);

    sendSuccess(res, result, "Saved posts removed successfully.");
  } catch (error) {
    next(error);
  }
};

export const getSavedPostsController: RequestHandler = async (req, res, next) => {
  try {
    const result = await getSavedPosts(req.user);

    sendSuccess(res, result, "Saved posts fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const checkSavedPostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await checkSavedPost(getPostIdParam(req.params.postId), req.user);

    sendSuccess(res, result, "Saved post status fetched successfully.");
  } catch (error) {
    next(error);
  }
};
