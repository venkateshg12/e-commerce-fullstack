import { Router } from "express";
import { loginHandler, logoutHandler, refreshHandler, registerHandler, verifyEmailHandler } from "../controllers/auth.controller";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerHandler)
authRoutes.post("/login", loginHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailHandler);