import { NOT_FOUND } from "../constants/https";
import { Request, Response } from "express";
import { fail } from "../utils/apiEnvelope";

export function notFound(req: Request, res: Response) {
    res.status(NOT_FOUND).json(fail(`Route not Found: ${req.method} ${req.originalUrl}`));
}