import type { RequestHandler } from "express";
import { UserRole } from "@prisma/client";

import { sendSuccess } from "../utils/response.js";
import { createSystemLog } from "../utils/system-log.helper.js";
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

    await createSystemLog({
      module: "POST",
      actorId: req.user?.id,
      action: "CREATE_POST",
      targetType: "Post",
      targetId: result.id,
      description: `Đã tạo bài đăng #${result.id}.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        postId: result.id,
        title: result.title,
        postType: result.postType,
        propertyType: result.propertyType,
      },
    });

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

export const getMyPostsController: RequestHandler = async (req, res, next) => {
  try {
    const result = await getPosts(
      {
        ...req.query,
        authorId: req.user!.id,
      },
      req.user,
    );

    sendSuccess(res, result, "My posts fetched successfully.");
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

    if (req.user?.role === UserRole.ADMIN && typeof req.body.status === "string") {
      await createSystemLog({
        module: "POST",
        actorId: req.user.id,
        action: `UPDATE_POST_STATUS_${req.body.status}`,
        targetType: "Post",
        targetId: getPostIdParam(req.params.id),
        description: `Quản trị viên đã chuyển bài đăng #${req.params.id} sang trạng thái ${req.body.status}.`,
        severity:
          req.body.status === "BANNED"
            ? "WARNING"
            : req.body.status === "HIDDEN"
              ? "WARNING"
              : "INFO",
        status: "SUCCESS",
        request: req,
        metadata: {
          postId: getPostIdParam(req.params.id),
          status: req.body.status,
        },
      });
    }

    sendSuccess(res, result, "Post updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const deletePostController: RequestHandler = async (req, res, next) => {
  try {
    await deletePost(getPostIdParam(req.params.id), req.user);

    await createSystemLog({
      module: "POST",
      actorId: req.user?.id,
      action: "HIDE_POST",
      targetType: "Post",
      targetId: getPostIdParam(req.params.id),
      description: `Đã ẩn bài đăng #${req.params.id}.`,
      severity: "WARNING",
      status: "SUCCESS",
      request: req,
      metadata: {
        postId: getPostIdParam(req.params.id),
      },
    });

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

    await createSystemLog({
      module: "STORAGE",
      actorId: req.user?.id,
      action: "ADD_POST_IMAGES",
      targetType: "Post",
      targetId: getPostIdParam(req.params.id),
      description: `Đã thêm ảnh cho bài đăng #${req.params.id}.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        postId: getPostIdParam(req.params.id),
        imageCount: result.images?.length ?? null,
      },
    });

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

    await createSystemLog({
      module: "STORAGE",
      actorId: req.user?.id,
      action: "DELETE_POST_IMAGE",
      targetType: "Post",
      targetId: getPostIdParam(req.params.id),
      description: `Đã xóa ảnh ${req.params.imageId} khỏi bài đăng #${req.params.id}.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        postId: getPostIdParam(req.params.id),
        imageId: getPostIdParam(req.params.imageId),
      },
    });

    sendSuccess(res, null, "Post image deleted successfully.");
  } catch (error) {
    next(error);
  }
};
