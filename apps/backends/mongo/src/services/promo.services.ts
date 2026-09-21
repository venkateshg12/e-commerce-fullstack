import mongoose from "mongoose";
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from "../constants/https";
import { PromoModel } from "../models/promo.model";
import { PromoDocument } from "../types/promo.types";
import { appAssert } from "../utils/errors";
import { CreatePromoSchema, UpdatePromoSchema } from "@repo/types";

export function mapPromos(item: PromoDocument) {
    return {
        _id: String(item._id || ""),
        code: item.code,
        percentage: item.percentage,
        count: item.count,
        minimumOrderValue: item.minimumOrderValue,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

// What a shopper can use right now: in its date window and with uses left. Biggest discount first.
export const getActivePromosService = async () => {
    const now = new Date();
    const promos = await PromoModel.find({
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        count: { $gt: 0 },
    }).sort({ percentage: -1, endsAt: 1 });
    return promos.map((item) => mapPromos(item.toObject()));
};

export const getPromoService = async () => {
    const promos = await PromoModel.find({}).sort({ createdAt: -1 });
    return promos.map((item) => mapPromos(item.toObject()));
};

export const createPromoService = async (data: CreatePromoSchema) => {
    const code = data.code.trim().toUpperCase();

    const existing = await PromoModel.findOne({ code });

    appAssert(!existing, CONFLICT, "Promo code already exists");

    const promo = await PromoModel.create({
        ...data,
        code,
    });

    return mapPromos(promo.toObject());
};

export const updatePromoService = async (
    promoId: string,
    data: UpdatePromoSchema
) => {
    appAssert(
        mongoose.isValidObjectId(promoId),
        BAD_REQUEST,
        "Invalid promo ID"
    );

    const promo = await PromoModel.findById(promoId);
    appAssert(promo, NOT_FOUND, "Promo not found");

    if (data.code) {
        const code = data.code.trim().toUpperCase();

        const duplicate = await PromoModel.findOne({
            code,
            _id: { $ne: promoId },
        });

        appAssert(
            !duplicate,
            CONFLICT,
            "Promo code already exists"
        );

        data.code = code;
    }

    Object.assign(promo, data);
    await promo.save();
    return mapPromos(promo.toObject());
};

export const deletePromoService = async (promoId: string) => {
    appAssert(mongoose.isValidObjectId(promoId), BAD_REQUEST, "Invalid promo ID");

    const deleted = await PromoModel.findByIdAndDelete(promoId);
    appAssert(deleted, NOT_FOUND, "Promo not found");

    return { message: "Pomo deleted Successfully!" };
};

export const applyPromoService = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    const promo = await PromoModel.findOne({ code: cleanCode });
    appAssert(promo, NOT_FOUND, "Invalid promo code");

    const now = new Date();

    appAssert(
        now >= promo.startsAt && now <= promo.endsAt,
        BAD_REQUEST,
        "Promo code has expired or is not active"
    );

    appAssert(
        promo.count > 0,
        BAD_REQUEST,
        "Promo code usage limit reached"
    );

    return mapPromos(promo.toObject());
};