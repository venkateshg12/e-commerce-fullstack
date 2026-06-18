import { OK } from "../constants/https";
import { createAccount } from "../services.ts/auth.service";
import appAssert from "../utils/appAssert";
import { catchError } from "../utils/catchError";
import { registerInput } from "@repo/types";

export const registerHandler = catchError(
    async (req, res) => {
        // validate request
        const request = registerInput.parse({
            ...req.body,
            userAgent: req.headers["user-agent"]
        });

        const result = await createAccount(request);
        console.log("result: ", result);

        res.status(OK).json({"result": result});
        // call a service 
        // return response
    }
)