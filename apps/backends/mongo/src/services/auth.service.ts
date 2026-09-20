import { Types } from "mongoose";
import { ChangePasswordSchema, CredentialSchema, LoginInSchema, UpdateProfileSchema } from "@repo/types";
import UserModel from "../models/user.model";
import { appAssert } from "../utils/errors";
import { BAD_REQUEST, CONFLICT, NOT_FOUND, OK, UNAUTHORIZED } from "../constants/https";
import VerificationLinkModel from "../models/verificationLink.model";
import { VerificationLinkType } from "../constants/verificationLinkType";
import { ONE_DAY_MS, tenMinutesFromNow, thirtyDaysFromNow } from "../utils/date";
import sessionModel from "../models/session.model";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import { createVerificationToken, hashVerificationToken, refreshTokenSignOptions, signToken, verifyToken } from "../utils/auth";
import { getPasswordResetEmail, sendMail } from "../utils/email";
import { RefreshTokenPayload } from "../types/auth.types";
import SessionModel from "../models/session.model";
import { EmailProducer } from "../jobs/producers/email.producer";
import { uploadSingleBuffersToCloudinary } from "../utils/cloudinary";


export const createAccount = async (data: CredentialSchema) => {

    //verify existing user doesn't exist
    const existingUser = await UserModel.exists({ email: data.email });
    appAssert(!existingUser, CONFLICT, "User already exists!");

    // create user
    const user = await UserModel.create({
        name: data.name,
        email: data.email,
        password: data.password
    });

    // create verification email 
    const { token, tokenHash } = createVerificationToken();

    const verificationLink = await VerificationLinkModel.create({
        userId: user._id,
        type: VerificationLinkType.EmailVerification,
        token: tokenHash,
        expiresAt: tenMinutesFromNow()
    });

    await EmailProducer.sendVerifyMail({
        userId: user._id.toString(),
        email: user.email,
        verificationToken: token,
    });

    // return user
    return { user: user.omitPassword() };
}


export const loginUser = async ({ email, password, userAgent }: LoginInSchema) => {

    //get the user by email
    const user = await UserModel.findOne({ email })
    appAssert(user, UNAUTHORIZED, "Invalid email or password");

    // validate the password from the request 
    const isValid = await user.comparePassword(password);
    appAssert(isValid, UNAUTHORIZED, "Invalid email or password");

    if (!user.verified) {
        await VerificationLinkModel.deleteMany({
            userId: user._id,
            type: VerificationLinkType.EmailVerification
        });

        const { token, tokenHash } = createVerificationToken();
        await VerificationLinkModel.create({
            userId: user._id,
            type: VerificationLinkType.EmailVerification,
            token: tokenHash,
            expiresAt: tenMinutesFromNow()
        })

        await EmailProducer.sendVerifyMail({
            userId: user._id.toString(),
            email: user.email,
            verificationToken: token,
        });

        appAssert(false, UNAUTHORIZED, "you are not verified , please look into the email");
    }



    //create a session
    const userId = user._id;
    const session = await sessionModel.create({
        userId,
        userAgent
    })

    // sign access token & refresh token
    const refreshToken = signToken(
        {
            sessionId: session._id
        },
        refreshTokenSignOptions
    )

    const accessToken = signToken(
        {
            userId: user._id,
            role: user.role,
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

    const user = await UserModel.findById(session.userId);
    appAssert(user, UNAUTHORIZED, "User not found");

    // refresh the session if it expires in 24 hours
    const sessionNeedsRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;

    if (sessionNeedsRefresh) {
        session.expiresAt = thirtyDaysFromNow();
        await session.save();
    }

    const newRefreshToken = sessionNeedsRefresh ? signToken(
        { sessionId: session._id }, refreshTokenSignOptions
    ) : undefined

    const accessToken = signToken({
        userId: user._id,
        role: user.role,
        sessionId: session._id,
    });

    return { accessToken, newRefreshToken };
}

export const sentResetPasswordEmail = async (email: string) => {
    // get the user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
        return { message: "If an account with that email exists, a password reset link has been sent." };
    }

    // create verification email
    const { token, tokenHash } = createVerificationToken();
    const verificationLink = await VerificationLinkModel.create({
        userId: user._id,
        type: VerificationLinkType.PasswordReset,
        token: tokenHash,
        expiresAt: tenMinutesFromNow()
    })

    //send password reset email via BullMQ
    await EmailProducer.sendPasswordReset({
        userId: user._id.toString(),
        email: user.email,
        resetToken: token,
    });

    //return success
    return { message: "If an account with that email exists, a password reset link has been sent." }
}

export const resetPassword = async ({ token, password }: { token: string; password: string }) => {

    // Only the digest is stored, so the link from the email is hashed to find its row.
    const verificationLink = await VerificationLinkModel.findOne({
        token: hashVerificationToken(token),
        type: VerificationLinkType.PasswordReset
    });

    appAssert(
        verificationLink && verificationLink.expiresAt.getTime() > Date.now(),
        BAD_REQUEST,
        "Invalid or expired reset link"
    );

    const user = await UserModel.findById(verificationLink.userId);
    appAssert(user, NOT_FOUND, "User not found");

    user.password = password;
    await user.save();

    await verificationLink.deleteOne();

    await SessionModel.deleteMany({ userId: user._id });

    return { message: "Password reset successful" };
}

export const resendVerificationEmail = async (email: string) => {
    
    const user = await UserModel.findOne({ email });
    appAssert(user, NOT_FOUND, "User does not exist! Please register");
    appAssert(!user.verified, BAD_REQUEST, "Email is already verified. Please login");

    await VerificationLinkModel.deleteMany({
        userId: user._id,
        type: VerificationLinkType.EmailVerification
    });

    const { token, tokenHash } = createVerificationToken();
    await VerificationLinkModel.create({
        userId: user._id,
        type: VerificationLinkType.EmailVerification,
        token: tokenHash,
        expiresAt: tenMinutesFromNow()
    });

    await EmailProducer.sendVerifyMail({
        userId: user._id.toString(),
        email: user.email,
        verificationToken: token,
    });

    return { message: "A new verification link was successfully sent to your email" };
}

export const updateProfileService = async (userId: string | Types.ObjectId, data: UpdateProfileSchema) => {
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    user.name = data.name;
    await user.save();

    return user.omitPassword();
}

export const updateAvatarService = async (userId: string | Types.ObjectId, fileBuffer: Buffer) => {
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    const { url } = await uploadSingleBuffersToCloudinary(fileBuffer, "shopymart/avatars");
    user.avatar = url;
    await user.save();

    return user.omitPassword();
}

export const changePasswordService = async (
    userId: string | Types.ObjectId,
    currentSessionId: string | Types.ObjectId,
    data: ChangePasswordSchema
) => {
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");
    appAssert(
        user.authProvider === "local",
        BAD_REQUEST,
        "Password change is not available for accounts signed in with Google"
    );

    const isValid = await user.comparePassword(data.currentPassword);
    appAssert(isValid, UNAUTHORIZED, "Current password is incorrect");

    user.password = data.newPassword;
    await user.save();

    // Sign the user out of every other device/session, keep the current one active
    await SessionModel.deleteMany({ userId: user._id, _id: { $ne: currentSessionId } });

    return { message: "Password changed successfully. You've been signed out of all other devices." };
}