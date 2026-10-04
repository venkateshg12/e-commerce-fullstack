import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { deleteSessionHandler, getSessionHandler } from "../controllers/session.controller";

export const sessionRoutes = Router();

sessionRoutes.use(authenticate);

sessionRoutes.get("/", getSessionHandler);
sessionRoutes.delete("/:id", deleteSessionHandler);
