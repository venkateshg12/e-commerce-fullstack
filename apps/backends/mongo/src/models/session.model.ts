import mongoose from "mongoose";
import { SessionDocument } from "../types/session.types";
import { thirtyDaysFromNow } from "../utils/date";

const sessionSchema = new mongoose.Schema<SessionDocument>({
    userId : {
        ref : "User",
        type : mongoose.Schema.Types.ObjectId,
        index : true,
    },
    userAgent : {
        type : String,
    },
    createdAt : {
        type : Date,
        required : true,
        default : Date.now
    },
    expiresAt : {
        type : Date,
        default :  thirtyDaysFromNow()
    }
})

const SessionModel = mongoose.model<SessionDocument>("Session", sessionSchema);
export default SessionModel;