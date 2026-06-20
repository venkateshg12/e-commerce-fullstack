import { CookieParams } from "@repo/types"
import { CookieOptions } from "express";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "./date";
import { Response } from "express";

const secure = process.env.NODE_ENV !== "development";
export const REFRESH_PATH = "/auth/refresh"

const defaults: CookieOptions = {
    sameSite: "strict",
    httpOnly: true,
    secure
}

export const getAccessTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: fifteenMinutesFromNow()
})

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: thirtyDaysFromNow(),
    path: REFRESH_PATH
})

export const setAuthCookies = ({ res, accessToken, refreshToken }: CookieParams) =>
    res.cookie("accessToken", accessToken, getAccessTokenCookieOptions()).cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

export const clearAuthCookies = (res: Response) =>
    res.clearCookie("accessToken").clearCookie("refreshToken", { path:REFRESH_PATH});
