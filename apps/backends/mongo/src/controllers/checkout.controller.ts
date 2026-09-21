import { OK } from "../constants/https";
import { catchError, ok } from "../utils";
import {
    confirmCheckoutSessionSchema,
    createCheckoutSessionSchema,
    payWithPointsSchema,
    resumeCheckoutSessionSchema,
} from "@repo/types";
import {
    confirmCheckoutSessionService,
    createCheckoutSessionService,
    getUserPointsService,
    payWithPointsService,
    resumeCheckoutSessionService,
} from "../services/checkout.service";

export const createCheckoutHandler = catchError(
    async (req, res) => {
        const data = createCheckoutSessionSchema.parse(req.body);
        const session = await createCheckoutSessionService(req.userId!, data);
        return res.status(OK).json(ok(session));
    }
);

export const confirmCheckoutHandler = catchError(
    async (req, res) => {
        const data = confirmCheckoutSessionSchema.parse(req.body);
        const result = await confirmCheckoutSessionService(req.userId!, data);
        return res.status(OK).json(ok(result));
    }
);

export const resumeCheckoutHandler = catchError(
    async (req, res) => {
        const data = resumeCheckoutSessionSchema.parse(req.body);
        const session = await resumeCheckoutSessionService(req.userId!, data);
        return res.status(OK).json(ok(session));
    }
);

export const getUserPointsHandler = catchError(
    async (req, res) => {
        const result = await getUserPointsService(req.userId!);
        return res.status(OK).json(ok(result));
    }
);

export const payWithPointsHandler = catchError(
    async (req, res) => {
        const data = payWithPointsSchema.parse(req.body);
        const result = await payWithPointsService(req.userId!, data);
        return res.status(OK).json(ok(result));
    }
);