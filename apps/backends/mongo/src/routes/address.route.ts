import { Router } from "express";
import { createAddressHandler, deleteAddressHandler, getAddressHandler, updateAddressHanlder } from "../controllers/address.controller";

export const addressRouter = Router();  

addressRouter.get("/address", getAddressHandler);
addressRouter.post("/address", createAddressHandler);
addressRouter.patch("/address/:id", updateAddressHanlder);
addressRouter.delete("/address/:id", deleteAddressHandler);