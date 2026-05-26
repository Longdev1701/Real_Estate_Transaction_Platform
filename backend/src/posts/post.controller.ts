import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import {
  addPostImages,
  createPost,
  deletePost,
  deletePostImage,
  getPostById,
  getPosts,
  updatePost,
} from "./post.service.js";

const getPostIdParam = (id: string | string[]) =>
  Array.isArray(id) ? id[0] : id;

export const createPostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await createPost(
      req.body,
      Array.isArray(req.files) ? req.files : [],
      req.body.imageMetadata,
      req.user,
    );

    sendSuccess(res, result, "Post created successfully.", 201);
  } catch (error) {
    next(error);
  }
};

export const getPostsController: RequestHandler = async (req, res, next) => {
  try {
    const result = await getPosts(req.query, req.user);

    sendSuccess(res, result, "Posts fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const getPostByIdController: RequestHandler = async (req, res, next) => {
  try {
    const result = await getPostById(getPostIdParam(req.params.id), req.user);

    sendSuccess(res, result, "Post fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const updatePostController: RequestHandler = async (req, res, next) => {
  try {
    const result = await updatePost(
      getPostIdParam(req.params.id),
      req.body,
      req.user,
    );

    sendSuccess(res, result, "Post updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const deletePostController: RequestHandler = async (req, res, next) => {
  try {
    await deletePost(getPostIdParam(req.params.id), req.user);

    sendSuccess(res, null, "Post deleted successfully.");
  } catch (error) {
    next(error);
  }
};

export const addPostImagesController: RequestHandler = async (req, res, next) => {
  try {
    const result = await addPostImages(
      getPostIdParam(req.params.id),
      Array.isArray(req.files) ? req.files : [],
      req.body.imageMetadata,
      req.user,
    );

    sendSuccess(res, result, "Post images added successfully.");
  } catch (error) {
    next(error);
  }
};

export const deletePostImageController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    await deletePostImage(
      getPostIdParam(req.params.id),
      getPostIdParam(req.params.imageId),
      req.user,
    );

    sendSuccess(res, null, "Post image deleted successfully.");
  } catch (error) {
    next(error);
  }
};
