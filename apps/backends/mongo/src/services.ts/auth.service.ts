import { CredentialSchema, LoginInSchema } from "@repo/types";
import UserModel from "../models/user.model";
import appAssert from "../utils/appAssert";
import { CONFLICT, UNAUTHORIZED } from "../constants/https";
import VerificationLinkModel from "../models/verificationLink.model";
import { VerificationLinkType } from "../constants/verificationLinkType";
import { tenMinutesFromNow } from "../utils/date";
import sessionModel from "../models/session.model";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";



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
    const verificationLink = VerificationLinkModel.create({
        userId: user._id,
        type: VerificationLinkType.EmailVerification,
        expiresAt: tenMinutesFromNow()

    })

    // create session
    const session = await sessionModel.create({
        userId: user._id,
        userAgent: data.userAgent,
    })

    // sign access token & refresh token
    const refreshToken = jwt.sign(
        {
            userId: user._id,
            sessionId: session._id
        },
        JWT_REFRESH_SECRET,
        { expiresIn: "30d" }
    )

    const accessToken = jwt.sign(
        {
            userId: user._id,
            sessionId: session._id
        },
        JWT_SECRET,
        { expiresIn: "15m" }
    )
    return { user: user.omitPassword(), accessToken, refreshToken };
}
// send a verification email
// return user & tokens


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
    const accessToken = jwt.sign(
        {
            userId: userId,
            sessionId: session._id
        },
        JWT_SECRET,
        { expiresIn: "15m" },
    )

    const refreshToken = jwt.sign(
        {
            userId: userId,
            sessionId: session._id
        },
        JWT_REFRESH_SECRET,
        { expiresIn: "30d" },
    )

    // return user & tokens
    return { user:user.omitPassword(), accessToken, refreshToken };
}