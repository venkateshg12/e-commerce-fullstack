import { Router } from "express";
import { getHomeHandler } from "../controllers/home.controller";

export const homeRouter = Router();

homeRouter.get("/home", getHomeHandler);