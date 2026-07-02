import { RequestHandler } from "express";
import appAssert from "../utils/appAssert";
import { FORBIDDEN } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";

const requireAdmin : RequestHandler = (req, res, next) => {
   // console.log("Inside requireAdmin");
   appAssert(req.role === "admin", FORBIDDEN, "Admin access only", appErrorCode.Forbidden);
   next();
}
export default requireAdmin;