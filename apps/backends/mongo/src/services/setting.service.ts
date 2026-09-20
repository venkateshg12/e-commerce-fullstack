import { Types } from "mongoose";
import { BannerModel } from "../models/banner.model";
import { BAD_REQUEST } from "../constants/https";
import { appAssert } from "../utils/errors";
import { addProcessBannerImageJob } from "../jobs/producers/image.producer";

export const getBannersService = async () => {
    const banners = await BannerModel.find().sort({ createdAt: -1 });
    return banners.map((banner) => ({
        _id: String(banner._id),
        imageUrl: banner.imageUrl,
        imagePublicId: banner.imagePublicId,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt,
    }));
};

export const createBannersService = async (
    userId: string | Types.ObjectId,
    files: Express.Multer.File[]
) => {
    appAssert(
        files && files.length > 0,
        BAD_REQUEST,
        "At least one image is required"
    );

    const payloadFiles = files.map((file) => ({
        bufferBase64: file.buffer.toString("base64"),
        originalName: file.originalname,
        mimeType: file.mimetype,
    }));

    await addProcessBannerImageJob({
        userId: String(userId),
        files: payloadFiles,
    });

    return {
        message: "Banner images are being processed in the background",
    };
};


