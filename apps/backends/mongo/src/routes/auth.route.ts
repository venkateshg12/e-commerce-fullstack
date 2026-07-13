import { Router } from "express";
import { forgotPasswordHandler, loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerificationHandler, resetPasswordHandler, verifyEmailHandler } from "../controllers/auth.controller";
import { googleAuthHandler } from "../controllers/googleAuth.controller";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerHandler)
authRoutes.post("/login", loginHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailHandler);
authRoutes.post("/verify/resend", resendVerificationHandler);
authRoutes.post("/password/forgot", forgotPasswordHandler);
authRoutes.post("/password/reset/:token", resetPasswordHandler);
authRoutes.post("/google", googleAuthHandler);