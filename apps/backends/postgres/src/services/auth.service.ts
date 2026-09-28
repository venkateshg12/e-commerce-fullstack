import crypto from "crypto";
import { CredentialSchema, LoginInSchema } from "@repo/types";
import { orm } from "../prisma/db";
import type { Models } from "../prisma/contract";
import appAssert from "../utils/errors/appAssert";
import { BAD_REQUEST, CONFLICT, NOT_FOUND, UNAUTHORIZED } from "../constants/http";
import { compareValue, hashValue } from "../utils/auth/bcrypt";
import { omitPassword } from "../utils/auth/omitPassword";
import { VerificationLinkType } from "../constants/verificationLinkType";
import { createVerificationToken, hashVerificationToken } from "../utils/auth/verificationToken";
import { tenMinutesFromNow, thirtyDaysFromNow } from "../utils/date/date";
import { refreshTokenSignOptions, refreshTokenVerifyOptions, signToken, verifyToken } from "../utils/auth/jwt";
import { RefreshTokenPayload } from "../types/auth.types";
import { appErrorCode } from "../constants/appErrorCode";


const dummyPasswordHash = hashValue(crypto.randomBytes(32).toString("hex"));

const REFRESH_REUSE_GRACE_MS = 30 * 1000;



const issueEmailVerificationLink = async (user: Pick<Models.public_User, "id" | "email">) => {
    // Delete any existing verification link for this user & type
    await orm.VerificationLink
        .where({
            userId: user.id,
            type: VerificationLinkType.EmailVerification,
        })
        .delete();

    // Create a new verification token & save hashed token to Postgres
    const { token, tokenHash } = createVerificationToken();
    await orm.VerificationLink.create({
        userId: user.id,
        type: VerificationLinkType.EmailVerification,
        token: tokenHash,
        expiresAt: tenMinutesFromNow().toISOString(),
    });

    // TODO: Dispatch verify email job once email producer/worker queue is ported from Mongo
    // await EmailProducer.sendVerifyMail({ userId: user.id, email: user.email, verificationToken: token });

};

type SessionUser = Pick<Models.public_User, "id" | "role">;

const signAccessToken = (user: SessionUser, sessionId: Models.public_Session["id"]) =>
    signToken({
        userId: user.id,
        role: user.role,
        sessionId
    });

const signRefreshToken = (sessionId: Models.public_Session["id"], jti: string) =>
    signToken({ sessionId, jti }, refreshTokenSignOptions);

export const createSessionAndTokens = async (user: SessionUser, userAgent?: string) => {
    const refreshJti = crypto.randomUUID();

    const session = await orm.Session.
        create({
            userId: user.id,
            userAgent,
            refreshJti
        });

    return {
        accessToken: signAccessToken(user, session.id),
        refreshToken: signRefreshToken(session.id, refreshJti)
    }
}


export const revokeSessions = async (filter: Parameters<typeof orm.Session.where>[0]) => {

    const sessions = await orm.Session
        .where(filter)
        .select("id")
        .all();

    if (sessions.length == 0) return 0;
    const ids = sessions.map((s) => s.id);

    await orm.Session.
        where((s) => s.id.in(ids))
        .delete();

    return ids.length;
}

export const createAccount = async (data: CredentialSchema) => {
    // verify existing user doesn't exist
    const existingUser = await orm.User
        .where({ email: data.email })
        .select("id")
        .first();
    appAssert(!existingUser, CONFLICT, "User already exists!");

    // create user
    const passwordHash = await hashValue(data.password);
    const user = await orm.User.create({
        name: data.name,
        email: data.email,
        passwordHash,
    });

    await issueEmailVerificationLink(user);

    // return user
    return { user: omitPassword(user) };
};


export const loginUser = async ({ email, password, userAgent }: LoginInSchema) => {

    const user = await orm.User.where({ email }).first();

    // validate the password from the request — against a dummy hash when there's nothing to
    // compare, so an unknown email takes as long to reject as a wrong password
    const isValid = user?.passwordHash
        ? await compareValue(password, user.passwordHash)
        : await compareValue(password, await dummyPasswordHash).then(() => false);

    appAssert(user && isValid, UNAUTHORIZED, "Invalid email or password");

    if (!user.verified) {
        await issueEmailVerificationLink(user);
        appAssert(false, UNAUTHORIZED, "you are not verified , please look into the email");
    }

    const { accessToken, refreshToken } = await createSessionAndTokens(user, userAgent);

    return {
        user: omitPassword(user),
        accessToken,
        refreshToken
    };
};


export const refreshUserAccessToken = async (refreshToken: string) => {
    const now = Date.now();
    const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, refreshTokenVerifyOptions);
    appAssert(payload && payload.jti, UNAUTHORIZED, "Invalid refresh token", appErrorCode.InvalidAccessToken);

    const session = await orm.Session
        .where({ id: payload.sessionId })
        .select("id", "userId", "expiresAt")
        .first();
    appAssert(session && new Date(session.expiresAt).getTime() > now, UNAUTHORIZED, "Session Expired!", appErrorCode.InvalidAccessToken);

    const user = await orm.User
        .where({ id: session.userId })
        .select("id", "role")
        .first();
    appAssert(user, UNAUTHORIZED, "User not found", appErrorCode.InvalidAccessToken);

    // Rotate only if the presented token is still the current one. Doing it as a conditional update
    // means two concurrent refreshes can't both rotate and leave one of them holding a dead token.
    const newJti = crypto.randomUUID();

    const rotated = await orm.Session
        .where({ id: session.id, refreshJti: payload.jti })
        .update({
            refreshJti: newJti,
            prevRefreshJti: payload.jti,
            rotatedAt: new Date(now).toISOString(),
            expiresAt: thirtyDaysFromNow().toISOString()
        });

    let currentJti: string;

    if (rotated) {
        currentJti = newJti;
    } else {
        // Lost the race, or the token is stale. Re-read to see which.
        const latest = await orm.Session
            .where({ id: session.id })
            .select("refreshJti", "prevRefreshJti", "rotatedAt")
            .first();
        const isRecentlyReplaced =
            latest?.refreshJti &&
            latest.prevRefreshJti === payload.jti &&
            latest.rotatedAt &&
            now - new Date(latest.rotatedAt).getTime() < REFRESH_REUSE_GRACE_MS;

        if (!isRecentlyReplaced) {
            await revokeSessions({ id: session.id });
            appAssert(false, UNAUTHORIZED, "Session revoked", appErrorCode.InvalidAccessToken);
        }

        currentJti = latest!.refreshJti;
    }

    return {
        accessToken: signAccessToken(user, session.id),
        newRefreshToken: signRefreshToken(session.id, currentJti)
    };
}


export const verifyEmail = async (token: string, userAgent?: string) => {

    const verificationLink = await orm.VerificationLink
        .where({
            token: hashVerificationToken(token),
            type: VerificationLinkType.EmailVerification,
        })
        .where((v) => v.expiresAt.gt(new Date().toISOString()))
        .first();


    appAssert(verificationLink, BAD_REQUEST, "Verification link has expired or is invalid.");

    await orm.VerificationLink
        .where({ id: verificationLink.id })
        .delete();

    const user = await orm.User.
        where({ id: verificationLink.userId }).
        update({
            verified: true
        })
    appAssert(user, NOT_FOUND, "User not found! Please register");

    const { accessToken, refreshToken } = await createSessionAndTokens(user, userAgent);

    return { user: omitPassword(user), accessToken, refreshToken };

}