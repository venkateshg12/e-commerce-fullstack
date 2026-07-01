import { RequestHandler } from "express";
import appAssert from "../utils/appAssert";
import { UNAUTHORIZED } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";
import { verifyToken } from "../utils/jwt";

const authenticate: RequestHandler = (req, res, next) => {
    const accessToken = req.cookies.accessToken as string | undefined;
    appAssert(accessToken, UNAUTHORIZED, "Not Authorized", appErrorCode.InvalidAccessToken);

    const { error, payload } = verifyToken(accessToken);

    appAssert(payload, UNAUTHORIZED, error == "jwt expired" ? "Token expired" : "Invalid token", appErrorCode.InvalidAccessToken);

    req.userId = payload.userId;
    req.sessionId = payload.sessionId;
    next();

}

export default authenticate;