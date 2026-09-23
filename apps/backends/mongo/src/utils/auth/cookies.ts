import { CookieParams } from "@repo/types";
import { CookieOptions, Response } from "express";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "../date";
import { NODE_ENV } from "../../constants/env";

const secure = NODE_ENV !== "development";
export const REFRESH_PATH = "/auth/refresh";

const defaults: CookieOptions = {
    sameSite: "strict",
    httpOnly: true,
    secure
};

export const getAccessTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: fifteenMinutesFromNow()
});

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: thirtyDaysFromNow(),
    path: REFRESH_PATH
});

export const setAuthCookies = ({ res, accessToken, refreshToken }: CookieParams) =>
    res.cookie("accessToken", accessToken, getAccessTokenCookieOptions()).cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

export const clearAuthCookies = (res: Response) =>
    res.clearCookie("accessToken").clearCookie("refreshToken", { ...defaults, path: REFRESH_PATH });
