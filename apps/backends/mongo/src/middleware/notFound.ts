import { fail } from "node:assert";
import { NOT_FOUND } from "../constants/https";
import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
    res.status(NOT_FOUND).json(fail(`Route not Found ${req.method}`));
}