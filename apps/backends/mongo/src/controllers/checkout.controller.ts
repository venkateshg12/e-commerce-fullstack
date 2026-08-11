import { OK } from "../constants/https";
import { catchError, ok } from "../utils";
import { createCheckoutSessionSchema } from "@repo/types";
import { createCheckoutSessionService } from "../services/checkout.service";

export const createCheckoutHandler = catchError(
    async (req, res) => {
        const data = createCheckoutSessionSchema.parse(req.body);
        const session = await createCheckoutSessionService(req.userId!, data);
        return res.status(OK).json(ok(session));
    }
);