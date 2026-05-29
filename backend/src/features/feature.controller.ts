import type { RequestHandler } from "express";
import { PropertyType } from "@prisma/client";
import { sendSuccess } from "../utils/response.js";
import { getFeatures } from "./feature.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export const getFeaturesController: RequestHandler = async (req, res, next) => {
  try {
    const propertyTypeQuery = req.query.propertyType as string | undefined;
    let propertyType: PropertyType | undefined;

    if (propertyTypeQuery) {
      if (!Object.values(PropertyType).includes(propertyTypeQuery as PropertyType)) {
        throw new AppError("Invalid propertyType query parameter.", 400);
      }
      propertyType = propertyTypeQuery as PropertyType;
    }

    const features = await getFeatures(propertyType);
    sendSuccess(res, features, "Features fetched successfully.");
  } catch (error) {
    next(error);
  }
};
