import { CredentialSchema, LoginInSchema } from "@repo/types";
import UserModel from "../models/user.model";
import appAssert from "../utils/appAssert";
import { CONFLICT, UNAUTHORIZED } from "../constants/https";
import VerificationLinkModel from "../models/verificationLink.model";
import { VerificationLinkType } from "../constants/verificationLinkType";
import { ONE_DAY_MS, tenMinutesFromNow, thirtyDaysFromNow } from "../utils/date";
import sessionModel from "../models/session.model";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import { refreshTokenSignOptions, singToken, verifyToken } from "../utils/jwt";
import { RefreshTokenPayload } from "../types/auth.types";
import SessionModel from "../models/session.model";
import crypto from "crypto";
import { getVerificationEmail } from "../utils/emailTemplates";
import { sendMail } from "../utils/sendMail";


export const createAccount = async (data: CredentialSchema) => {

    //verify existing user doesn't exist
    const existingUser = await UserModel.exists({ email: data.email });
    appAssert(!existingUser, CONFLICT, "User already exists!");

    // create user
    const user = await UserModel.create({
        name: data.name,
        email: data.email,
        password: data.password
    })


    // create verification email 
    const token = crypto.randomBytes(32).toString("hex");

    const verificationLink = await VerificationLinkModel.create({
        userId: user._id,
        type: VerificationLinkType.EmailVerification,
        token: token,
        expiresAt: tenMinutesFromNow()
    });

    const emailTemplate = getVerificationEmail(token);
    await sendMail({
        to: user.email,
        ...emailTemplate
    });


    // return user & tokens
    return { user: user.omitPassword() };
}


export const loginUser = async ({ email, password, userAgent }: LoginInSchema) => {

    //get the user by email
    const user = await UserModel.findOne({ email })
    appAssert(user, UNAUTHORIZED, "Invalid email or password");

    // validate the password from the request 
    const isValid = await user.comparePassword(password);
    appAssert(isValid, UNAUTHORIZED, "Invalid email or password");

    //create a session
    const userId = user._id;
    const session = await sessionModel.create({
        userId,
        userAgent
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
            sessionId: session._id
        }
    )

    // return user & tokens
    return { user: user.omitPassword(), accessToken, refreshToken };
}


export const refreshUserAccessToken = async (refreshToken: string) => {
    const now = Date.now();
    const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, { secret: JWT_REFRESH_SECRET });
    appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

    const session = await SessionModel.findById(payload.sessionId);
    appAssert(session && (session.expiresAt.getTime() > now), UNAUTHORIZED, "Session Expired!")

    // refresh the session if it expires in 24 hours
    const sessionNeedsRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;

    if (sessionNeedsRefresh) {
        session.expiresAt = thirtyDaysFromNow();
        await session.save();
    }

    const newRefreshToken = sessionNeedsRefresh ? singToken(
        { sessionId: session._id }, refreshTokenSignOptions
    ) : undefined

    const accessToken = singToken({
        userId: session.userId,
        sessionId: session._id
    });

    return { accessToken, newRefreshToken };
}