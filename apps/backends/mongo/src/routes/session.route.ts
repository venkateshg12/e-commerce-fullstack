import express, { Router } from "express"
import authenticate from "../middleware/authenticate";
import { deleteSessionHandler, getSessionHandler } from "../controllers/session.controller";

const sessionRoutes = Router();

sessionRoutes.get("/", authenticate, getSessionHandler)
sessionRoutes.delete("/:id", authenticate, deleteSessionHandler);

export default sessionRoutes;

