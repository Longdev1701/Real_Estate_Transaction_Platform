import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import { getHomeData } from "./home.service.js";

export const getHomeController: RequestHandler = async (_req, res, next) => {
  try {
    const result = await getHomeData();

    sendSuccess(res, result, "Home data fetched successfully.");
  } catch (error) {
    next(error);
  }
};
