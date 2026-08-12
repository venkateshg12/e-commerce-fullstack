import { Router } from "express";
import { forgotPasswordHandler, getProfileData, loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerificationHandler, resetPasswordHandler, verifyEmailHandler } from "../controllers/auth.controller";
import { googleAuthHandler } from "../controllers/googleAuth.controller";
import authenticate from "../middleware/authenticate";
import { forgotPasswordLimiter, loginLimiter, registerLimiter, verifyEmailLimiter } from "../config/rateLimiter";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerLimiter, registerHandler);
authRoutes.post("/login", loginLimiter, loginHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailLimiter, verifyEmailHandler);
authRoutes.post("/verify/resend", verifyEmailLimiter, resendVerificationHandler);
authRoutes.post("/password/forgot", forgotPasswordLimiter, forgotPasswordHandler);
authRoutes.post("/password/reset/:token", forgotPasswordLimiter, resetPasswordHandler);
authRoutes.post("/google", loginLimiter, googleAuthHandler);
authRoutes.get("/me", authenticate, getProfileData);