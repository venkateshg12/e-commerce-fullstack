import { appAssert, catchError } from "../utils/errors";
import { FORBIDDEN } from "../constants/https";
import { appErrorCode } from "../constants/appErrorCode";
import UserModel from "../models/user.model";

/*
  The role in the access token is a snapshot from when it was signed, so trusting it would leave a
  demoted admin with admin rights until the token expired. Admin traffic is low enough that reading
  the current role on every admin request costs nothing worth saving. Runs after `authenticate`.
 */
const requireAdmin = catchError(async (req, _res, next) => {
   const user = await UserModel.findById(req.userId).select("role").lean();
   appAssert(user?.role === "admin", FORBIDDEN, "Admin access only", appErrorCode.Forbidden);
   req.role = user.role;
   next();
});

export default requireAdmin;
