import { Types } from "mongoose";
import { UserDocument } from "./user.types";

declare global {
    namespace Express {
        interface Request {
            userId: Types.ObjectId;
            sessionId: Types.ObjectId;
            role: UserDocument["role"];
            visitorId?: string;
        }
    }
}

export {};