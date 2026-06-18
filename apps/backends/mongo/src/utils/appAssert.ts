import assert from "node:assert";
import { AppError } from "./appError";
import { HttpStatusCode } from "../constants/https";

// Asserts a condition and throws an AppError if the condition is falsy.
 type AppAssert = (
    condition: any,
    httpStatusCode: HttpStatusCode,
    message: string,
) => asserts condition  // If appAssert doesn't throw, then typescript thinks that condition must be true.
const appAssert: AppAssert = (
    condition: any,
    httpStatusCode,
    message
) => {
    assert(condition, new AppError(httpStatusCode, message));
}

export default appAssert;  