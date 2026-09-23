import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { fail } from "../utils/api";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../constants/https";
import z from "zod";
import { MulterError } from "multer";
import { clearAuthCookies, REFRESH_PATH } from "../utils/auth";

const handleZodError = (res: Response, error: z.ZodError) => {
    const errors = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
    }))
    return res.status(BAD_REQUEST).json({ errors });
}

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (error instanceof z.ZodError) {
        return handleZodError(res, error)
    }

    /*
      Upload failures are the caller's fault, not the server's: a rejected file type or an
      oversized file used to fall through to the generic 500 below, which told the admin
      "Internal Server Error" for a file they could simply have replaced.
     */
    if (error instanceof MulterError) {
        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "That file is too large. Images must be 10MB or smaller."
                : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
                  ? "Too many files in one upload."
                  : error.message;
        return res.status(BAD_REQUEST).json(fail(message, error.code));
    }

    // `fileFilter` rejects with a plain Error carrying a caller-facing message.
    if (error instanceof Error && error.message.startsWith("Invalid file type")) {
        return res.status(BAD_REQUEST).json(fail(error.message, "INVALID_FILE_TYPE"));
    }
    if(_req.path ===  REFRESH_PATH) {
        clearAuthCookies(res);
    }
    if (error instanceof AppError) {
        return res.status(error.statusCode).json(fail(error.message, error.errorCode ?? "APP_ERROR"));
    }
    console.error("error", error);

    return res.status(INTERNAL_SERVER_ERROR).json(fail("Internal Server Error", "INTERNAL_SERVER_ERROR"));
}