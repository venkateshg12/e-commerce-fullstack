import type { CookieParams } from "@repo/types";
import type { CookieOptions, Response } from "express";
import { NODE_ENV } from "../../constants/env";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "../date/date";

const secure = NODE_ENV !== "development";
export const REFRESH_PATH = "/auth/refresh";

const defaults: CookieOptions = {
    sameSite: "strict",
    httpOnly: true,
    secure
};

export const accessCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: fifteenMinutesFromNow()
});

export const refreshCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: thirtyDaysFromNow(),
    path: REFRESH_PATH
});

export const setAuthCookies = ({ res, accessToken, refreshToken }: CookieParams) =>
    res.cookie("accessToken", accessToken, accessCookieOptions()).cookie("refreshToken", refreshToken, refreshCookieOptions());

export const clearAuthCookies = (res: Response) =>
    res.clearCookie("accessToken").clearCookie("refreshToken", { ...defaults, path: REFRESH_PATH });
