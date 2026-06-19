import { Router } from "express";
import { loginHandler, registerHandler } from "../controllers/auth.controller";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerHandler)
authRoutes.post("/login", loginHandler);