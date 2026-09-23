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
    // The function itself, not its result: calling it here would evaluate once at module load and
    // give every session the same expiry — 30 days after the server booted.
    expiresAt : {
        type : Date,
        default :  thirtyDaysFromNow,
        // Mongo's TTL monitor deletes a session once its expiry passes.
        index : { expireAfterSeconds: 0 }
    },
    /*
      Refresh-token rotation. Only the jti of the refresh token issued last is valid; presenting any
      other one means an old token was replayed, and the session is revoked. The previous jti is
      kept for a short grace window so two tabs refreshing at the same moment don't trip that.
     */
    refreshJti : {
        type : String,
    },
    prevRefreshJti : {
        type : String,
    },
    rotatedAt : {
        type : Date,
    }
})

const SessionModel = mongoose.model<SessionDocument>("Session", sessionSchema);
export default SessionModel;
