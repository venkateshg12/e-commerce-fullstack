import { Router } from "express";
import { getHomeHandler } from "../controllers/home.controller";
import { publicCatalogLimiter } from "../config/rateLimiter";

export const homeRouter = Router();

homeRouter.get("/home", publicCatalogLimiter, getHomeHandler);