import { OAuth2Client } from "google-auth-library";
import UserModel from "../models/user.model";
import SessionModel from "../models/session.model";
import { catchError } from "../utils/catchError";
import appAssert from "../utils/appAssert";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from "../constants/https";
import { GOOGLE_CLIENT_ID } from "../constants/env";
import { refreshTokenSignOptions, singToken } from "../utils/jwt";
import { setAuthCookies } from "../utils/cookies";
import { ok } from "../utils/apiEnvelope";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const googleAuthHandler = catchError(async (req, res) => {
    const { idToken } = req.body;
    appAssert(idToken, BAD_REQUEST, "Google ID token is required");
    appAssert(GOOGLE_CLIENT_ID, INTERNAL_SERVER_ERROR, "Google Client ID is not configured on the server");

    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID,
        });
    } catch (err: any) {
        console.error("Google Auth token verification failed:", err);
        appAssert(false, UNAUTHORIZED, "Invalid Google ID token");
    }

    const payload = ticket.getPayload();
    appAssert(payload, UNAUTHORIZED, "Invalid token payload");

    const { email, email_verified, name, sub: googleId, picture: avatar } = payload;
    appAssert(email && email_verified, UNAUTHORIZED, "Unverified Google account or email missing");

    // Find existing user by email
    let user = await UserModel.findOne({ email });

    if (user) {
        // Handle blocked users before login
        if ((user as any).isBlocked) {
            appAssert(false, UNAUTHORIZED, "Your account has been suspended.");
        }

        // Link Google profile if missing or update details
        let updated = false;
        if (!user.googleId) {
            user.googleId = googleId;
            updated = true;
        }

        if (avatar && user.avatar !== avatar) {
            user.avatar = avatar;
            updated = true;
        }

        if (!user.verified) {
            user.verified = true;
            updated = true;
        }

        if (updated) {
            await user.save();
        }
    } else {
        // Create new user (verified Google account)
        user = await UserModel.create({
            email,
            name: name || email.split("@")[0],
            googleId,
            authProvider: "google",
            avatar,
            verified: true,
        });
    }

    // Create session document exactly like local login
    const userAgent = req.headers["user-agent"];
    const session = await SessionModel.create({
        userId: user._id,
        userAgent,
    });

    // Sign Access and Refresh tokens
    const refreshToken = singToken(
        {
            sessionId: session._id
        },
        refreshTokenSignOptions
    );

    const accessToken = singToken(
        {
            userId: user._id,
            role: user.role,
            sessionId: session._id
        }
    );

    // Set HttpOnly Cookies and Return SuccessResponse
    setAuthCookies({ res, accessToken, refreshToken })
        .status(OK)
        .json(ok({
            user: user.omitPassword(),
            message: "Google login successful!"
        }));
});


/*

Receive ID Token
        │
        ▼
Verify it's really from Google
        │
        ▼
Extract Google user's details
        │
        ▼
Find existing user by email
        │
   ┌────┴────┐
   │         │
Exists?     No?
   │         │
Link info   Create user
   └────┬────┘
        ▼
Create application session
        ▼
Generate JWT access & refresh tokens
        ▼
Set HttpOnly cookies
        ▼
Return authenticated user */