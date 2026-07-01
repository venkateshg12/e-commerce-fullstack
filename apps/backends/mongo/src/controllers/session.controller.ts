import z from "zod";
import { NOT_FOUND, OK } from "../constants/https";
import SessionModel from "../models/session.model";
import { catchError } from "../utils/catchError";
import appAssert from "../utils/appAssert";

export const getSessionHandler = catchError(
    async (req, res, next) => {
        const session = await SessionModel.find(
            {
                userId: req.userId, expiresAt: { $gt: new Date() }
            },
            {
                _id: 1, userAgent: 1, createdAt: 1
            },
            {
                sort: { createdAt: -1 },
            }
        );
        return res.status(OK).json(
            session.map((session) => ({
                ...session.toObject(),
                isCurrent: session._id.equals(req.sessionId),
            }))
        );
    }
)

export const deleteSessionHandler = catchError(
    async (req, res) => {
        const sessionId = z.string().parse(req.params.id);
        const deleted = await SessionModel.findOneAndDelete(
            {
                _id: sessionId,
                userId: req.userId,
            }
        )
        appAssert(deleted, NOT_FOUND, "Session not found");
        return res.status(OK).json(
            {
                message: "Session expired!"
            }
        )
    }
)