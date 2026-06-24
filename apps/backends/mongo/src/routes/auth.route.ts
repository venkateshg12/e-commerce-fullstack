import { Router } from "express";
import { forgotPasswordHanlder, loginHandler, logoutHandler, refreshHandler, registerHandler, resetPasswordHandler, verifyEmailHandler } from "../controllers/auth.controller";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerHandler)
authRoutes.post("/login", loginHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailHandler);
authRoutes.get("/password/forgot", forgotPasswordHanlder);
authRoutes.post("/password/reset/:token", resetPasswordHandler);