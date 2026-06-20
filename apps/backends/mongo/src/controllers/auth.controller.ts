import { BAD_REQUEST, CREATED, OK, UNAUTHORIZED } from "../constants/https";
import { createAccount, loginUser, refreshUserAccessToken } from "../services.ts/auth.service";
import { catchError } from "../utils/catchError";
import { loginInSchema, registerSchema } from "@repo/types";
import { clearAuthCookies, getAccessTokenCookieOptions, getRefreshTokenCookieOptions, setAuthCookies } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";
import SessionModel from "../models/session.model";
import appAssert from "../utils/appAssert";
import VerificationLinkModel from "../models/verificationLink.model";
import UserModel from "../models/user.model";
import { CORS_ORIGIN } from "../constants/env";

export const registerHandler = catchError(
    async (req, res) => {
        // validate request
        const request = registerSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"]
        });

        const { user, accessToken, refreshToken } = await createAccount(request);

        setAuthCookies({ res, accessToken, refreshToken })
            .status(CREATED)
            .json(user);
        // call a service 
        // return response
    }
)

export const loginHandler = catchError(

    async (req, res) => {
        // validate request
        const request = loginInSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"],
        })

        const { user, accessToken, refreshToken } = await loginUser(request);

        setAuthCookies({ res, accessToken, refreshToken })
            .status(OK)
            .json({
                user,
                message: "Login Successful!"
            })
    }
)

export const logoutHandler = catchError(
    async (req, res) => {
        const accessToken = req.cookies.accessToken;
        const { payload } = verifyToken(accessToken)
        if (payload) {
            await SessionModel.findByIdAndDelete(payload.sessionId);
        }

        clearAuthCookies(res).status(OK).json({ message: "Logout Successful!" });
    }
)

export const refreshHandler = catchError(
    async (req, res) => {
        const refreshToken = req.cookies.refreshToken as string | undefined;
        appAssert(refreshToken, UNAUTHORIZED, "Missing refresh Token");

        const { accessToken, newRefreshToken } = await refreshUserAccessToken(refreshToken);

        if (newRefreshToken) {
            res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());
        }
        res.status(OK).cookie("accessToken", accessToken, getAccessTokenCookieOptions()).json({
            message: "Access token refreshed"
        })
    }
)

export const verifyEmailHandler = catchError(
    async (req, res) => {
        const { token } = req.params;

        // find the token;
        const verificationLink = await VerificationLinkModel.findOne({ token });

        if (!verificationLink) {
            // If token is invalid or expired, redirect to frontend with error parameter
            return res.redirect(`${CORS_ORIGIN}/email-verification?success=false&reason=expired`);
        }

        const user = await UserModel.findByIdAndUpdate(
            verificationLink?.userId,
            { verified: true },
            { returnDocument:"after"}
        );

        if (!user) {
            return res.redirect(`${CORS_ORIGIN}/email-verification?success=false&reason=usernotfound`);
        }

        await verificationLink?.deleteOne();
        res.status(OK).json({messsage : "Email Verified Successfully!"})
        res.redirect(`${CORS_ORIGIN}/?verified=true`);
    }
)