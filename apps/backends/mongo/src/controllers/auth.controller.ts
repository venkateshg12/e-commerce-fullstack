import { CREATED, OK } from "../constants/https";
import { createAccount, loginUser } from "../services.ts/auth.service";
import { catchError } from "../utils/catchError";
import { loginInSchema, registerSchema } from "@repo/types";
import { setAuthCookies } from "../utils/cookies";

export const registerHandler = catchError(
    async (req, res) => {
        // validate request
        const request = registerSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"]
        });

        const { user, accessToken, refreshToken } = await createAccount(request);

        setAuthCookies({ res, accessToken, refreshToken })
            .status(CREATED)
            .json(user);
        // call a service 
        // return response
    }
)

export const loginHandler = catchError(

    async (req, res) => {
        // validate request
        const request = loginInSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"],
        })

        const { user, accessToken, refreshToken } = await loginUser(request);
        
        setAuthCookies({ res, accessToken, refreshToken })
            .status(OK)
            .json({
                user,
                message: "Login Successful!"
            })
    }
)