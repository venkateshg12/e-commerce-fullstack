import { Job } from "bullmq";
import ProductModel from "../../models/product.model";
import { BannerModel } from "../../models/banner.model";
import { destroyManyFromCloudinary, uploadSingleBuffersToCloudinary } from "../../utils/cloudinary";
import { cache } from "../../utils/cache";
import { invalidateProductDetails } from "../../services/product.service";
import {
  DeleteCloudinaryAssetsJobPayload,
  ProcessBannerImageJobPayload,
  ProcessProductImageJobPayload,
} from "../interfaces/jobPayload";

export async function processProductImagesJob(
  job: Job<ProcessProductImageJobPayload>
): Promise<void> {
  const { productId, files, position } = job.data;

  // 1. Check if product exists in MongoDB before processing
  const product = await ProductModel.findById(productId);
  if (!product) {
    console.warn(`[ImageProcessor] Product ${productId} no longer exists. Aborting job.`);
    return;
  }

  // 2. Mark uploadStatus as PROCESSING.
  //
  // NOTE: there is deliberately no "skip if already READY" guard here. It used to exist and
  // silently dropped an entire batch: two sequential uploads both set PENDING, the first job
  // finished and set READY, then the second job saw READY and returned without uploading
  // anything — while the client had already been told 202 Accepted. Retry safety instead comes
  // from the catch block below, which destroys this run's Cloudinary uploads before rethrowing,
  // so a retry always starts from a clean slate.
  await ProductModel.findByIdAndUpdate(productId, { uploadStatus: "PROCESSING" });

  const uploadedResults: Array<{
    url: string;
    publicId: string;
    isCover: boolean;
    color?: string;
  }> = [];

  try {
    // 3. Upload new images to Cloudinary, in the order the admin submitted them.
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const buffer = Buffer.from(fileData.bufferBase64, "base64");

      // Validate, compress WebP & upload to Cloudinary
      const uploaded = await uploadSingleBuffersToCloudinary(buffer, "shopymart/products");

      uploadedResults.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        // Cover is resolved after the push (step 5) — it cannot be decided from a stale read.
        isCover: false,
        color: fileData.color?.trim() || undefined,
      });
    }

    // 4. Insert atomically. $push is applied server-side, so concurrent jobs for the same
    // product can no longer clobber each other the way a read-modify-write $set did.
    // $position places the batch at a given index (e.g. right after the photos that existed
    // when an edit started); without it the batch is appended.
    await ProductModel.findByIdAndUpdate(productId, {
      $push: {
        images:
          position === undefined
            ? { $each: uploadedResults }
            : { $each: uploadedResults, $position: position },
      },
      $set: { uploadStatus: "READY" },
      $unset: { uploadError: 1 },
    });

    // 5. Guarantee exactly one cover. The filter only matches when the product still has no
    // cover, so this is a no-op for every later batch and is safe under concurrency.
    await ProductModel.updateOne(
      { _id: productId, "images.isCover": { $ne: true } },
      { $set: { "images.0.isCover": true } }
    );

    /*
      The worker may run in its own process; the cache lives in Redis, so this reaches the API's
      cache all the same. Only THIS product's page is dropped — the listings, which now show its
      images, are refreshed by the version bump.
     */
    await invalidateProductDetails([productId]);
    await cache.bump("products");

    console.log(`[ImageProcessor] Successfully processed and appended ${files.length} images for Product ${productId}`);
  } catch (err: any) {
    console.error(`[ImageProcessor Error] Product ${productId} failed: ${err.message}`);

    // Clean up partial Cloudinary uploads created during this run to prevent orphan storage.
    // Done inline rather than queued: this compensates for a failure already in flight.
    await destroyManyFromCloudinary(uploadedResults.map((img) => img.publicId));

    // Mark Product as FAILED if max attempts reached or fatal error occurred
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      await ProductModel.findByIdAndUpdate(productId, {
        $set: {
          uploadStatus: "FAILED",
          uploadError: err.message || "Failed to process product images",
        },
      });
      await invalidateProductDetails([productId]);
      await cache.bump("products");
    }

    throw err;
  }
}

export async function processBannerImagesJob(
  job: Job<ProcessBannerImageJobPayload>
): Promise<void> {
  const { userId, files } = job.data;

  const uploadedResults: Array<{ url: string; publicId: string }> = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const buffer = Buffer.from(fileData.bufferBase64, "base64");

      const uploaded = await uploadSingleBuffersToCloudinary(
        buffer,
        "shopymart/banners"
      );

      uploadedResults.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
      });
    }

    await BannerModel.insertMany(
      uploadedResults.map((item) => ({
        imageUrl: item.url,
        imagePublicId: item.publicId,
        createdBy: userId,
      }))
    );

    await cache.bump("banners");

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


/**
 * Destroys Cloudinary assets in the background.
 *
 * The Mongo side of a delete is done synchronously in the request (so the admin sees the images
 * gone immediately); this job only does the slow Cloudinary round-trips. It holds no database
 * write, which is what makes it safe for BullMQ to retry: destroying an already-destroyed id
 * reports "not found" rather than failing.
 */
export async function deleteCloudinaryAssetsJob(
  job: Job<DeleteCloudinaryAssetsJobPayload>
): Promise<void> {
  const { publicIds, productId } = job.data;

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
