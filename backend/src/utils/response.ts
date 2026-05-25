import type { Response } from "express";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiResponse<T>);
};

export const sendError = (
  res: Response,
  message = "Internal server error",
  statusCode = 500,
  errors?: unknown,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  } satisfies ApiResponse<never>);
};
