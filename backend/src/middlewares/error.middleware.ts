import type { ErrorRequestHandler } from "express";

import { sendError } from "../utils/response.js";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly errors?: unknown,
  ) {
    super(message);
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const errors = error instanceof AppError ? error.errors : undefined;

  sendError(res, message, statusCode, errors);
};
