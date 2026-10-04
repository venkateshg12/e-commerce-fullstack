import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "../constants/env";
import { processProductImage } from "./imageProcessor";

type CloudinaryUploadResult = {
    url: string;
    publicId: string;
};

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

export async function uploadSingleBuffersToCloudinary(
    fileBuffer: Buffer,
    folder = "shopymart/products"
): Promise<CloudinaryUploadResult> {
    // 1. Process & optimize image (Magic byte check, EXIF strip, WebP convert)
    const processed = await processProductImage(fileBuffer);

    // 2. Stream optimized WebP buffer to Cloudinary
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                format: "webp",
            },
            (error: any, result: any) => {
                if (error) {
                    return reject(error);
                }
                if (!result) {
                    return reject(new Error("Cloudinary upload failed!"));
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        streamifier.createReadStream(processed.buffer).pipe(uploadStream);
    });
}

export async function uploadManyBuffersToCloudinary(
    files: Buffer[],
    folder = "shopymart/products"
): Promise<CloudinaryUploadResult[]> {
    return Promise.all(
        files.map(file => uploadSingleBuffersToCloudinary(file, folder))
    );
}

export async function destroyManyFromCloudinary(
    publicIds: string[]
): Promise<{ deleted: number; failed: string[] }> {
    const ids = publicIds.filter(Boolean);
    if (!ids.length) return { deleted: 0, failed: [] };

    const failed: string[] = [];
    let deleted = 0;

    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        try {
            const result = await cloudinary.api.delete_resources(batch);
            deleted += Object.keys(result?.deleted ?? {}).length;
        } catch (err) {
            console.error("[Cloudinary Delete Error] Failed to destroy batch:", err);
            failed.push(...batch);
        }
    }

    return { deleted, failed };
}
