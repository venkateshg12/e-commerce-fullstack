import mongoose, { Types } from "mongoose";
import { BannerModel } from "../models/banner.model";
import { BAD_REQUEST, NOT_FOUND } from "../constants/https";
import { appAssert } from "../utils/errors";
import { addDeleteCloudinaryAssetsJob, addProcessBannerImageJob } from "../jobs/producers/image.producer";
import { cache } from "../utils/cache";

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

/**
 * Removes a banner and frees its Cloudinary asset. The document goes first so the admin sees it
 * disappear straight away; destroying the image is the slow part and goes to the same retrying job
 * the product images use. `imagePublicId` has been stored for exactly this since the model was
 * written — until now nothing ever deleted a banner, so uploads could only accumulate.
 */
export const deleteBannerService = async (bannerId: string) => {
    appAssert(mongoose.isValidObjectId(bannerId), BAD_REQUEST, "Invalid banner ID");

    const banner = await BannerModel.findByIdAndDelete(bannerId);
    appAssert(banner, NOT_FOUND, "Banner not found");

    // The storefront's hero slider comes from the home feed, which is namespaced by this version.
    await cache.bump("banners");

    if (banner.imagePublicId) {
        await addDeleteCloudinaryAssetsJob({ publicIds: [banner.imagePublicId] });
    }

    return { message: "Banner removed. Image cleanup is running in the background." };
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


