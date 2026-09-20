import mongoose from "mongoose";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import UserModel from "../models/user.model";
import { AddressDocument } from "../types/user.types";
import { appAssert } from "../utils/errors";
import { AddressSchema, UpdateAddressSchema } from "@repo/types";

export function mapAddress(item: AddressDocument) {
    return {
        _id: String(item._id || ""),
        fullName: item.fullName,
        address: item.address,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        country: item.country,
        isDefault: item.isDefault,
    };
}

export const getAddressService = async (userId: string | mongoose.Types.ObjectId) => {
    appAssert(mongoose.isValidObjectId(userId), BAD_REQUEST, "Invalid user ID");
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    const userAddress = user.address || [];
    const items = [...userAddress]
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map(mapAddress);

    return items;
};

export const createAddressService = async (
    userId: string | mongoose.Types.ObjectId,
    data: AddressSchema
) => {
    appAssert(mongoose.isValidObjectId(userId), BAD_REQUEST, "Invalid user ID");
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    const userAddress = user.address || [];
    const isFirstAddress = userAddress.length === 0;
    const shouldBeDefault = isFirstAddress || data.isDefault;

    if (shouldBeDefault && userAddress.length > 0) {
        userAddress.forEach((item) => {
            item.isDefault = false;
        });
    }

    userAddress.push({
        ...data,
        isDefault: shouldBeDefault,
    } as any);

    await user.save();

    const items = [...user.address]
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map(mapAddress);

    return items;
};

export const updateAddressService = async (
    userId: string | mongoose.Types.ObjectId,
    addressId: string,
    data: UpdateAddressSchema
) => {
    appAssert(mongoose.isValidObjectId(userId), BAD_REQUEST, "Invalid user ID");
    appAssert(mongoose.isValidObjectId(addressId), BAD_REQUEST, "Invalid address ID");

    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    const userAddress = user.address || [];
    const targetAddress = userAddress.find((item: any) => String(item._id) === addressId);
    appAssert(targetAddress, NOT_FOUND, "Address not found");

    const shouldMarkAsDefault = data.isDefault === true || userAddress.length === 1;

    if (shouldMarkAsDefault) {
        userAddress.forEach((item: any) => {
            item.isDefault = false;
        });
    }

    if (data.fullName !== undefined) targetAddress.fullName = data.fullName;
    if (data.address !== undefined) targetAddress.address = data.address;
    if (data.city !== undefined) targetAddress.city = data.city;
    if (data.state !== undefined) targetAddress.state = data.state;
    if (data.country !== undefined) targetAddress.country = data.country;
    if (data.postalCode !== undefined) targetAddress.postalCode = data.postalCode;

    if (shouldMarkAsDefault) {
        targetAddress.isDefault = true;
    } else if (data.isDefault === false) {
        targetAddress.isDefault = false;
    }

    await user.save();

    const items = [...user.address]
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map(mapAddress);

    return items;
};

export const deleteAddressService = async (
    userId: string | mongoose.Types.ObjectId,
    addressId: string
) => {
    appAssert(mongoose.isValidObjectId(userId), BAD_REQUEST, "Invalid user ID");
    appAssert(mongoose.isValidObjectId(addressId), BAD_REQUEST, "Invalid address ID");

    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, "User not found");

    const userAddress = user.address || [];
    const targetAddress = userAddress.find((item: any) => String(item._id) === addressId);
    appAssert(targetAddress, NOT_FOUND, "Address not found");

    const wasDefault = targetAddress.isDefault === true;

    // Remove address subdocument
    user.address = userAddress.filter((item: any) => String(item._id) !== addressId) as any;

    // Reassign default address status to first remaining item if default was deleted
    if (wasDefault && user.address.length > 0) {
        const hasDefault = user.address.some((item: any) => item.isDefault);
        if (!hasDefault) {
            user.address[0].isDefault = true;
        }
    }

    await user.save();

    const items = [...user.address]
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map(mapAddress);

    return items;
};

