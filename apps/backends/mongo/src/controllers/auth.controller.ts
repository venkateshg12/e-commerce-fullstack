import { BAD_REQUEST, CREATED, NOT_FOUND, OK, UNAUTHORIZED } from "../constants/https";
import { createAccount, loginUser, refreshUserAccessToken, resendVerificationEmail, resetPassword, sentResetPasswordEmail } from "../services.ts/auth.service";
import { catchError } from "../utils/catchError";
import { emailSchema, loginInSchema, registerSchema, resetPasswordSchema } from "@repo/types";
import { clearAuthCookies, getAccessTokenCookieOptions, getRefreshTokenCookieOptions, setAuthCookies } from "../utils/cookies";
import { refreshTokenSignOptions, singToken, verifyToken } from "../utils/jwt";
import SessionModel from "../models/session.model";
import appAssert from "../utils/appAssert";
import VerificationLinkModel from "../models/verificationLink.model";
import UserModel from "../models/user.model";
import { CORS_ORIGIN } from "../constants/env";
import { VerificationLinkType } from "../constants/verificationLinkType";
import sessionModel from "../models/session.model";
import { ok } from "../utils/apiEnvelope";

export const registerHandler = catchError(
    async (req, res) => {
        // validate request
        const request = registerSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"]
        });

        // call a service 
        const { user } = await createAccount(request);

        // return response
        return res.status(CREATED).json(ok({ title: "Account created Successfully", "message": "We've sent an account activation link to your email address. Please check your inbox to activate your account." }));
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
            .json(ok({
                user,
                message: "Login Successful!"
            }))
    }
)

export const logoutHandler = catchError(
    async (req, res) => {
        const accessToken = req.cookies.accessToken;
        const { payload } = verifyToken(accessToken)
        if (payload) {
            await SessionModel.findByIdAndDelete(payload.sessionId);
        }

        clearAuthCookies(res).status(OK).json(ok({ message: "Logout Successful!" }));
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
        return res.status(OK).cookie("accessToken", accessToken, getAccessTokenCookieOptions()).json(ok({
            message: "Access token refreshed"
        }))
    }
)

export const verifyEmailHandler = catchError(
    async (req, res) => {
        const { token } = req.params;

        // find the token;
        const verificationLink = await VerificationLinkModel.findOne(
            {
                token: token,
                type: VerificationLinkType.EmailVerification
            }
        );

        appAssert(verificationLink, BAD_REQUEST, "Verification link has expired or is invalid.");

        const user = await UserModel.findByIdAndUpdate(
            verificationLink.userId,
            { verified: true },
            { returnDocument: "after" }
        );

        appAssert(user, NOT_FOUND, "User not found! Please register");

        // create session
        const session = await sessionModel.create({
            userId: user._id,
            userAgent: req.headers["user-agent"] || "",
        })

        // sign access token & refresh token
        const refreshToken = singToken(
            {
                sessionId: session._id
            },
            refreshTokenSignOptions
        )

        const accessToken = singToken(
            {
                userId: user._id,
                role: user.role,
                sessionId: session._id
            }
        )

        await verificationLink.deleteOne();

        // 3. Set cookies on response and return success JSON
        return setAuthCookies({ res, accessToken, refreshToken }).status(OK).json(ok({
            user: user.omitPassword(),
            message: "Email verified successfully!"
        }));
    }
)

export const resendVerificationHandler = catchError(
    async (req, res) => {
        const { email } = emailSchema.parse(req.body);
        const result = await resendVerificationEmail(email);
        return res.status(OK).json(ok(result));
    }
)

export const forgotPasswordHandler = catchError(
    async (req, res) => {
        const request = emailSchema.parse(req.body);

        // call the service
        const sendLinkMessage = await sentResetPasswordEmail(request.email);
        return res.status(OK).json(ok(sendLinkMessage))
    }
)

export const resetPasswordHandler = catchError(
    async (req, res) => {
        const request = resetPasswordSchema.parse(req.body);
        const token = String(req.params.token)

        appAssert(token, BAD_REQUEST, "Missing reset token");

        await resetPassword({
            token,
            password: request.password
        });

        clearAuthCookies(res)
            .status(OK)
            .json(ok("Password reset successful"));
    }
);