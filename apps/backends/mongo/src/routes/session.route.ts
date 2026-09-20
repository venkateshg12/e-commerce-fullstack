import { Router } from "express"
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";
import { deleteSessionHandler, getSessionHandler } from "../controllers/session.controller";

const sessionRoutes = Router();

sessionRoutes.use(authenticate, protectedApiLimiter);

sessionRoutes.get("/", getSessionHandler);
sessionRoutes.delete("/:id", deleteSessionHandler);

export default sessionRoutes;


