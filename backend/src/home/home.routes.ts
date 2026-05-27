import { Router } from "express";

import { getHomeController } from "./home.controller.js";

export const homeRoutes = Router();

homeRoutes.get("/", getHomeController);
