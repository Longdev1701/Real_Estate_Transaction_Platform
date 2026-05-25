import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "./error.middleware.js";

type RequestSchema = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

const validatePart = (schema: ZodType | undefined, value: unknown) => {
  if (!schema) {
    return;
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError("Validation failed", 400, result.error.issues);
  }
};

export const validateRequest =
  (schema: RequestSchema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      validatePart(schema.body, req.body);
      validatePart(schema.query, req.query);
      validatePart(schema.params, req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
