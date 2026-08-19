import { CREATED, OK } from "../constants/https";
import { catchError, ok } from "../utils";
import { addressSchema, updateAddressSchema } from "@repo/types";
import {
    getAddressService,
    createAddressService,
    updateAddressService,
    deleteAddressService,
} from "../services/address.service";

export const getAddressHandler = catchError(
    async (req, res) => {
        const items = await getAddressService(req.userId!);
        return res.status(OK).json(ok(items));
    }
);

export const createAddressHandler = catchError(
    async (req, res) => {
        const data = addressSchema.parse(req.body);
        const items = await createAddressService(req.userId!, data);
        return res.status(CREATED).json(ok(items));
    }
);

export const updateAddressHanlder = catchError(
    async (req, res) => {
        const addressId = (req.params.id || req.params.addressId) as string;
        const data = updateAddressSchema.parse(req.body);
        const items = await updateAddressService(req.userId!, addressId, data);
        return res.status(OK).json(ok(items));
    }
);

export const deleteAddressHandler = catchError(
    async (req, res) => {
        const addressId = (req.params.id || req.params.addressId) as string;
        const items = await deleteAddressService(req.userId!, addressId);
        return res.status(OK).json(ok(items));
    }
);