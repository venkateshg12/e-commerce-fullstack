import { SignOptions, VerifyOptions } from "jsonwebtoken"
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import { AccessTokenPayload, RefreshTokenPayload } from "../types/auth.types";



type SignOptionsAndSecret = SignOptions & {
    secret: string
}

const accessTokenSignOptions: SignOptionsAndSecret = {
    expiresIn: "15m",
    secret: JWT_SECRET
}
export const refreshTokenSignOptions: SignOptionsAndSecret = {
    expiresIn: "30d",
    secret: JWT_REFRESH_SECRET
}

export const singToken = (
    payload: AccessTokenPayload | RefreshTokenPayload,
    options?: SignOptionsAndSecret
) => {
    const { secret, ...signOpts } = options || accessTokenSignOptions;
    return jwt.sign(payload, secret, signOpts);
}

export const verifyToken = <TPayload extends object = AccessTokenPayload>(
    token: string,
    options?: VerifyOptions & { secret: string }
) => {
    const { secret = JWT_SECRET, ...verifyOpts } = options || {};
    try {
        const payload = jwt.verify(
            token,
            secret,
            { ...verifyOpts }
        ) as TPayload;
        return {
            payload
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            return {
                error: error.message
            }
        }

        return {
            error: "Unknown error occured please try again!"
        };
    }
}