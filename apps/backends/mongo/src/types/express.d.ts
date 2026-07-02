
import { Types } from "mongoose";
import { UserDocument } from "./user.types";

declare module "express-serve-static-core" {
    interface Request {
        userId: Types.ObjectId;
        sessionId: Types.ObjectId;
        role : UserDocument["role"];
    }
}