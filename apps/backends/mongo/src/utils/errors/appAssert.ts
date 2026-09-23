import assert from "node:assert";
import { AppError } from "./appError";
import { HttpStatusCode } from "../../constants/https";
import { appErrorCode } from "../../constants/appErrorCode";

// Asserts a condition and throws an AppError if the condition is falsy.
type AppAssert = (
    condition: any,
    httpStatusCode: HttpStatusCode,
    message: string,
    appErrorCode?: appErrorCode
) => asserts condition;

const appAssert: AppAssert = (
    condition: any,
    httpStatusCode,
    message,
    appErrorCode
) => {
    assert(condition, new AppError(httpStatusCode, message, appErrorCode));
};

export default appAssert;
