import { Job, UnrecoverableError } from "bullmq";
import { z } from "zod";
import { destroyManyFromCloudinary, uploadSingleBuffersToCloudinary } from "../../utils/cloudinary";
import {
  DeleteCloudinaryAssetsJobPayload,
  ProcessBannerImageJobPayload,
  ProcessProductImageJobPayload,
} from "../interfaces/jobPayload";
import { db, orm } from "../../prisma/db";

const processProductImageSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  files: z
    .array(
      z.object({
        bufferBase64: z.string().min(1, "Image buffer is required"),
        originalName: z.string(),
        mimeType: z.string(),
        color: z.string().optional(),
      })
    )
    .min(1, "At least one image is required"),
  position: z.number().int().nonnegative().optional(),
});

const processBannerImageSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  files: z
    .array(
      z.object({
        bufferBase64: z.string().min(1, "Image buffer is required"),
        originalName: z.string(),
        mimeType: z.string(),
      })
    )
    .min(1, "At least one banner image is required"),
});

const deleteCloudinaryAssetsSchema = z.object({
  publicIds: z.array(z.string().min(1)),
  productId: z.string().optional(),
});

export async function processProductImagesJob(
  job: Job<ProcessProductImageJobPayload>
): Promise<void> {
  const parsed = processProductImageSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new UnrecoverableError(`Malformed product image job payload: ${parsed.error.message}`);
  }

  const { productId, files } = parsed.data;

  // 1. Check if product exists in PostgreSQL before processing
  const product = await orm.Product.where({ id: productId }).select("id").first();
  if (!product) {
    console.warn(`[ImageProcessor] Product ${productId} no longer exists. Aborting job.`);
    return;
  }

  // 2. Mark uploadStatus as PROCESSING
  await orm.Product.where({ id: productId }).update({
    uploadStatus: "PROCESSING",
    updatedAt: new Date().toISOString(),
  });

  const uploadedResults: Array<{
    url: string;
    publicId: string;
    isCover: boolean;
    color?: string;
  }> = [];

  try {
    // 3. Upload new images to Cloudinary, in the order the admin submitted them
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const buffer = Buffer.from(fileData.bufferBase64, "base64");

      // Validate, compress WebP & upload to Cloudinary
      const uploaded = await uploadSingleBuffersToCloudinary(buffer, "shopymart/products");

      uploadedResults.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        isCover: false,
        color: fileData.color?.trim() || undefined,
      });
    }

    // 4. Guarantee at least one cover image across existing and new images
    const existingImages = await orm.ProductImage.where({ productId }).select("id", "isCover").all();
    const hasCover = existingImages.some((img) => img.isCover);

    if (!hasCover && uploadedResults.length > 0) {
      uploadedResults[0].isCover = true;
    }

    // 5. Insert images into ProductImage table and update Product uploadStatus to READY atomically
    await db.transaction(async (tx) => {
      for (const img of uploadedResults) {
        await tx.orm.public.ProductImage.create({
          productId,
          url: img.url,
          publicId: img.publicId,
          isCover: img.isCover,
          color: img.color ?? null,
        });
      }

      await tx.orm.public.Product.where({ id: productId }).update({
        uploadStatus: "READY",
        uploadError: null,
        updatedAt: new Date().toISOString(),
      });
    });

    // Phase 08 (cache): invalidate this product's detail entry and bump "products".

    console.log(
      `[ImageProcessor] Successfully processed and inserted ${files.length} images for Product ${productId}`
    );
  } catch (err: any) {
    console.error(`[ImageProcessor Error] Product ${productId} failed: ${err.message}`);

    // Clean up partial Cloudinary uploads created during this run to prevent orphan storage
    await destroyManyFromCloudinary(uploadedResults.map((img) => img.publicId));

    // Mark Product as FAILED if max attempts reached or fatal error occurred
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      await orm.Product.where({ id: productId }).update({
        uploadStatus: "FAILED",
        uploadError: err.message || "Failed to process product images",
        updatedAt: new Date().toISOString(),
      });
      // Phase 08 (cache): invalidate this product's detail entry and bump "products".
    }

    throw err;
  }
}

export async function processBannerImagesJob(
  job: Job<ProcessBannerImageJobPayload>
): Promise<void> {
  const parsed = processBannerImageSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new UnrecoverableError(`Malformed banner image job payload: ${parsed.error.message}`);
  }

  const { userId, files } = parsed.data;

  const uploadedResults: Array<{ url: string; publicId: string }> = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const buffer = Buffer.from(fileData.bufferBase64, "base64");

      const uploaded = await uploadSingleBuffersToCloudinary(buffer, "shopymart/banners");

      uploadedResults.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
      });
    }

    await db.transaction(async (tx) => {
      for (const item of uploadedResults) {
        await tx.orm.public.Banner.create({
          imageUrl: item.url,
          imagePublicId: item.publicId,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // Phase 08 (cache): bump "banners".

    console.log(
      `[ImageProcessor] Successfully processed ${files.length} banner images for User ${userId}`
    );
  } catch (err: any) {
    console.error(
      `[ImageProcessor Error] Banner images failed for User ${userId}: ${err.message}`
    );

    await destroyManyFromCloudinary(uploadedResults.map((img) => img.publicId));

    throw err;
  }
}

/*
  Destroys Cloudinary assets in the background.
 */
export async function deleteCloudinaryAssetsJob(
  job: Job<DeleteCloudinaryAssetsJobPayload>
): Promise<void> {
  const parsed = deleteCloudinaryAssetsSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new UnrecoverableError(`Malformed delete assets job payload: ${parsed.error.message}`);
  }

  const { publicIds, productId } = parsed.data;

  const { deleted, failed } = await destroyManyFromCloudinary(publicIds);

  console.log(
    `[ImageProcessor] Destroyed ${deleted}/${publicIds.length} Cloudinary assets` +
      (productId ? ` for Product ${productId}` : "")
  );

  // Throw so BullMQ retries with backoff instead of silently leaving orphans behind.
  if (failed.length) {
    throw new Error(
      `Failed to destroy ${failed.length} Cloudinary asset(s): ${failed.join(", ")}`
    );
  }
}
