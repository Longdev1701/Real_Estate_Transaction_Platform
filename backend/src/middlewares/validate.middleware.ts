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
    return value;
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError("Validation failed", 400, result.error.issues);
  }

  return result.data;
};

export const validateRequest =
  (schema: RequestSchema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = validatePart(schema.body, req.body);
      }

      if (schema.query) {
        validatePart(schema.query, req.query);
      }

      if (schema.params) {
        req.params = validatePart(schema.params, req.params) as Request["params"];
      }

      next();
    } catch (error) {
      next(error);
    }
  };
