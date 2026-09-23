import crypto from "crypto";
import { QueryFilter, Types } from "mongoose";
import { ChangePasswordSchema, CredentialSchema, LoginInSchema, UpdateProfileSchema } from "@repo/types";
import UserModel from "../models/user.model";
import { appAssert } from "../utils/errors";
import { BAD_REQUEST, CONFLICT, NOT_FOUND, UNAUTHORIZED } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";
import VerificationLinkModel from "../models/verificationLink.model";
import { VerificationLinkType } from "../constants/verificationLinkType";
import { tenMinutesFromNow, thirtyDaysFromNow } from "../utils/date";
import {
    compareValue,
    createVerificationToken,
    hashValue,
    hashVerificationToken,
    refreshTokenSignOptions,
    refreshTokenVerifyOptions,
    signToken,
    verifyToken
} from "../utils/auth";
import { RefreshTokenPayload } from "../types/auth.types";
import { UserDocument } from "../types/user.types";
import SessionModel from "../models/session.model";
import { SessionDocument } from "../types/session.types";
import { cache, sessionCacheKey } from "../utils/cache";
import { EmailProducer } from "../jobs/producers/email.producer";
import { uploadSingleBuffersToCloudinary } from "../utils/cloudinary";

/*
  How long a just-replaced refresh token is still honoured. The client serialises refreshes within a
  tab, but two tabs share the cookie and can both refresh at the same moment; without a grace window
  the slower one would look like a replayed token and sign the user out everywhere.
 */
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

/*
  Compared against when the email has no account (or no password), so a failed login costs one
  bcrypt comparison either way and response time doesn't reveal which emails are registered.
 */
const dummyPasswordHash = hashValue(crypto.randomBytes(32).toString("hex"));

const GENERIC_RESEND_MESSAGE =
    "If that account exists and is not yet verified, a new verification link has been sent.";

/**
 * Deletes the matching sessions and clears their cached "active" state, so an access token for one
 * of them is rejected on its very next request. Every revocation goes through here: deleting session
 * documents directly would leave `authenticate` trusting its cache for up to a minute. Returns how
 * many sessions were revoked.
 */
export const revokeSessions = async (filter: QueryFilter<SessionDocument>) => {
    const sessions = await SessionModel.find(filter).select("_id").lean();
    if (sessions.length === 0) return 0;

    const ids = sessions.map((session) => session._id);
    // By id, not by the original filter: a session created after the find is not part of this revocation.
    await SessionModel.deleteMany({ _id: { $in: ids } });
    await cache.del(...ids.map(sessionCacheKey));
    return ids.length;
};

const signAccessToken = (user: UserDocument, sessionId: Types.ObjectId) =>
    signToken({
        userId: user._id,
        role: user.role,
        sessionId
    });

const signRefreshToken = (sessionId: Types.ObjectId, jti: string) =>
    signToken({ sessionId, jti }, refreshTokenSignOptions);

/**
 * Opens a new session and signs its first token pair. Every sign-in path (password, email
 * verification, Google) goes through here so they all record the refresh-token id that rotation
 * checks against.
 */
export const createSessionAndTokens = async (user: UserDocument, userAgent?: string) => {
    const refreshJti = crypto.randomUUID();
    const session = await SessionModel.create({
        userId: user._id,
        userAgent,
        refreshJti
    });

    return {
        accessToken: signAccessToken(user, session._id as Types.ObjectId),
        refreshToken: signRefreshToken(session._id as Types.ObjectId, refreshJti)
    };
};

const issueEmailVerificationLink = async (user: UserDocument) => {
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
};


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

    await issueEmailVerificationLink(user);

    // return user
    return { user: user.omitPassword() };
}


export const loginUser = async ({ email, password, userAgent }: LoginInSchema) => {

    //get the user by email
    const user = await UserModel.findOne({ email })

    // validate the password from the request — against a dummy hash when there's nothing to compare,
    // so an unknown email takes as long to reject as a wrong password
    const isValid = user?.password
        ? await user.comparePassword(password)
        : await compareValue(password, await dummyPasswordHash).then(() => false);

    appAssert(user && isValid, UNAUTHORIZED, "Invalid email or password");

    if (!user.verified) {
        await issueEmailVerificationLink(user);
        appAssert(false, UNAUTHORIZED, "you are not verified , please look into the email");
    }

    const { accessToken, refreshToken } = await createSessionAndTokens(user, userAgent);

    // return user & tokens
    return { user: user.omitPassword(), accessToken, refreshToken };
}


/**
 * Exchanges a refresh token for a new access token AND a new refresh token. Each refresh token is
 * single-use: presenting one that has already been exchanged means it was copied, so the whole
 * session is revoked — both the thief and the victim are signed out, and the thief's copy is dead.
 */
export const refreshUserAccessToken = async (refreshToken: string) => {
    const now = Date.now();
    const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, refreshTokenVerifyOptions);
    appAssert(payload && payload.jti, UNAUTHORIZED, "Invalid refresh token", appErrorCode.InvalidAccessToken);

    const session = await SessionModel.findById(payload.sessionId);
    appAssert(session && session.expiresAt.getTime() > now, UNAUTHORIZED, "Session Expired!", appErrorCode.InvalidAccessToken);

    const user = await UserModel.findById(session.userId);
    appAssert(user, UNAUTHORIZED, "User not found", appErrorCode.InvalidAccessToken);

    // Rotate only if the presented token is still the current one. Doing it as a conditional update
    // means two concurrent refreshes can't both rotate and leave one of them holding a dead token.
    const newJti = crypto.randomUUID();
    const rotated = await SessionModel.findOneAndUpdate(
        { _id: session._id, refreshJti: payload.jti },
        {
            refreshJti: newJti,
            prevRefreshJti: payload.jti,
            rotatedAt: new Date(now),
            expiresAt: thirtyDaysFromNow()
        },
        { returnDocument: "after" }
    );

    let currentJti: string;

    if (rotated) {
        currentJti = newJti;
    } else {
        // Lost the race, or the token is stale. Re-read to see which.
        const latest = await SessionModel.findById(session._id);
        const isRecentlyReplaced =
            latest?.refreshJti &&
            latest.prevRefreshJti === payload.jti &&
            latest.rotatedAt &&
            now - latest.rotatedAt.getTime() < REFRESH_REUSE_GRACE_MS;

        if (!isRecentlyReplaced) {
            await revokeSessions({ _id: session._id });
            appAssert(false, UNAUTHORIZED, "Session revoked", appErrorCode.InvalidAccessToken);
        }

        currentJti = latest.refreshJti!;
    }

    const sessionId = session._id as Types.ObjectId;
    return {
        accessToken: signAccessToken(user, sessionId),
        newRefreshToken: signRefreshToken(sessionId, currentJti)
    };
}

export const verifyEmail = async (token: string, userAgent?: string) => {
    // Stored as a digest, so the link's token is hashed to find its row. Found and consumed in one
    // atomic step, so two concurrent clicks can't both succeed.
    const verificationLink = await VerificationLinkModel.findOneAndDelete({
        token: hashVerificationToken(token),
        type: VerificationLinkType.EmailVerification,
        expiresAt: { $gt: new Date() }
    });
    appAssert(verificationLink, BAD_REQUEST, "Verification link has expired or is invalid.");

    const user = await UserModel.findByIdAndUpdate(
        verificationLink.userId,
        { verified: true },
        { returnDocument: "after" }
    );
    appAssert(user, NOT_FOUND, "User not found! Please register");

    const { accessToken, refreshToken } = await createSessionAndTokens(user, userAgent);

    return { user: user.omitPassword(), accessToken, refreshToken };
}

export const sentResetPasswordEmail = async (email: string) => {
    const genericMessage = "If an account with that email exists, a password reset link has been sent.";

    // get the user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
        return { message: genericMessage };
    }

    // Only the newest reset link is valid; older ones sitting in an inbox are invalidated.
    await VerificationLinkModel.deleteMany({
        userId: user._id,
        type: VerificationLinkType.PasswordReset
    });

    const { token, tokenHash } = createVerificationToken();
    await VerificationLinkModel.create({
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

    return { message: genericMessage }
}

export const resetPassword = async ({ token, password }: { token: string; password: string }) => {

    // Only the digest is stored, so the link from the email is hashed to find its row. Found and
    // consumed atomically, so the same link can't be redeemed twice by concurrent requests.
    const verificationLink = await VerificationLinkModel.findOneAndDelete({
        token: hashVerificationToken(token),
        type: VerificationLinkType.PasswordReset,
        expiresAt: { $gt: new Date() }
    });
    appAssert(verificationLink, BAD_REQUEST, "Invalid or expired reset link");

    const user = await UserModel.findById(verificationLink.userId);
    appAssert(user, NOT_FOUND, "User not found");

    user.password = password;
    await user.save();

    await VerificationLinkModel.deleteMany({
        userId: user._id,
        type: VerificationLinkType.PasswordReset
    });

    await revokeSessions({ userId: user._id });

    return { message: "Password reset successful" };
}

/*
  Answers the same way whether or not the account exists or is already verified — the old
  "User does not exist" / "already verified" replies let anyone test which emails are registered.
 */
export const resendVerificationEmail = async (email: string) => {
    const user = await UserModel.findOne({ email });

    if (user && !user.verified) {
        await issueEmailVerificationLink(user);
    }

    return { message: GENERIC_RESEND_MESSAGE };
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
    await revokeSessions({ userId: user._id, _id: { $ne: currentSessionId } });

    return { message: "Password changed successfully. You've been signed out of all other devices." };
}
