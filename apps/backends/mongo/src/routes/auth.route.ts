import { Router } from "express";
import { changePasswordHandler, forgotPasswordHandler, getProfileData, loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerificationHandler, resetPasswordHandler, updateAvatarHandler, updateProfileHandler, verifyEmailHandler } from "../controllers/auth.controller";
import { googleAuthHandler } from "../controllers/googleAuth.controller";
import authenticate from "../middleware/authenticate";
import { forgotPasswordAccountLimiter, forgotPasswordLimiter, forgotPasswordSourceLimiter, loginAccountLimiter, loginLimiter, loginSourceLimiter, protectedApiLimiter, refreshTokenLimiter, registerLimiter, verifyEmailLimiter } from "../config/rateLimiter";
import { upload } from "../middleware/upload";

export const authRoutes = Router();

// prefix : /auth

authRoutes.post("/register", registerLimiter, registerHandler);
// Three axes, cheapest first: this source, this account, then the (source, account) pair.
authRoutes.post("/login", loginSourceLimiter, loginAccountLimiter, loginLimiter, loginHandler);
authRoutes.get("/refresh", refreshTokenLimiter, refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailLimiter, verifyEmailHandler);
authRoutes.post("/verify/resend", verifyEmailLimiter, resendVerificationHandler);
authRoutes.post("/password/forgot", forgotPasswordSourceLimiter, forgotPasswordAccountLimiter, forgotPasswordLimiter, forgotPasswordHandler);
authRoutes.post("/password/reset/:token", forgotPasswordLimiter, resetPasswordHandler);
// No email in this body, so the pair-keyed limiter would put every Google sign-in from a source
// into one bucket. The source limiter is the one that means anything here.
authRoutes.post("/google", loginSourceLimiter, googleAuthHandler);
authRoutes.get("/me", authenticate, protectedApiLimiter, getProfileData);
authRoutes.patch("/me", authenticate, protectedApiLimiter, updateProfileHandler);
authRoutes.post("/me/avatar", authenticate, protectedApiLimiter, upload.single("avatar"), updateAvatarHandler);
authRoutes.post("/me/password", authenticate, protectedApiLimiter, changePasswordHandler);