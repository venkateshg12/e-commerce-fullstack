import { Router } from "express";
import {
    changePasswordHandler,
    forgotPasswordHandler,
    getProfileData,
    loginHandler,
    logoutHandler,
    refreshHandler,
    registerHandler,
    resendVerificationHandler,
    resetPasswordHandler,
    updateAvatarHandler,
    updateProfileHandler,
    verifyEmailHandler,
} from "../controllers/auth.controller";
import { googleAuthHandler } from "../controllers/googleAuth.controller";
import authenticate from "../middleware/authenticate";
import { upload } from "../middleware/upload";

export const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/verify/:token", verifyEmailHandler);
authRoutes.post("/verify/resend", resendVerificationHandler);
authRoutes.post("/password/forgot", forgotPasswordHandler);
authRoutes.post("/password/reset/:token", resetPasswordHandler);
authRoutes.post("/google", googleAuthHandler);
authRoutes.get("/me", authenticate, getProfileData);
authRoutes.patch("/me", authenticate, updateProfileHandler);
authRoutes.post("/me/avatar", authenticate, upload.single("avatar"), updateAvatarHandler);
authRoutes.post("/me/password", authenticate, changePasswordHandler);
