import { Router } from "express";
import { getFeaturesController } from "./feature.controller.js";

export const featureRoutes = Router();

featureRoutes.get("/", getFeaturesController);
