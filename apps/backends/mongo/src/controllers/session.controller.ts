import z from "zod";
import { Types } from "mongoose";
import { NOT_FOUND, OK } from "../constants/https";
import SessionModel from "../models/session.model";
import { catchError, appAssert } from "../utils/errors";
import { ok } from "../utils/api";
import { revokeSessions } from "../services/auth.service";

// A malformed id used to reach Mongo and come back as a CastError, i.e. a 500.
const sessionIdSchema = z.string().refine((id) => Types.ObjectId.isValid(id), { message: "Invalid session id" });

export const getSessionHandler = catchError(
    async (req, res) => {
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
            ok(session.map((session) => ({
                ...session.toObject(),
                isCurrent: session._id.equals(req.sessionId),
            })))
        );
    }
)

export const deleteSessionHandler = catchError(
    async (req, res) => {
        const sessionId = sessionIdSchema.parse(req.params.id);
        const revoked = await revokeSessions({
            _id: sessionId,
            userId: req.userId,
        });
        appAssert(revoked > 0, NOT_FOUND, "Session not found");
        return res.status(OK).json(
            ok({
                message: "Session expired!"
            })
        )
    }
)
