import { Router } from "express";
import { createAddressHandler, deleteAddressHandler, getAddressHandler, updateAddressHanlder } from "../controllers/address.controller";
import authenticate from "../middleware/authenticate";
import { protectedApiLimiter } from "../config/rateLimiter";

export const addressRouter = Router();

addressRouter.use(authenticate, protectedApiLimiter);

addressRouter.get("/address", getAddressHandler);
addressRouter.post("/address", createAddressHandler);
addressRouter.patch("/address/:id", updateAddressHanlder);
addressRouter.delete("/address/:id", deleteAddressHandler);