import { randomUUID } from "crypto";
import { imageQueue } from "../queues/image.queue";
import { JOB_NAMES } from "../../constants/queue";
import {
  DeleteCloudinaryAssetsJobPayload,
  ProcessBannerImageJobPayload,
  ProcessProductImageJobPayload,
} from "../interfaces/jobPayload";

export async function addProcessProductImageJob(
  payload: ProcessProductImageJobPayload
): Promise<void> {
  await imageQueue.add(JOB_NAMES.IMAGE.PROCESS_PRODUCT_IMAGES, payload, {
    jobId: `prod_img_${payload.productId}_${randomUUID()}`,
  });
}

export async function addProcessBannerImageJob(
  payload: ProcessBannerImageJobPayload
): Promise<void> {
  await imageQueue.add(JOB_NAMES.IMAGE.PROCESS_BANNER_IMAGES, payload, {
    jobId: `banner_img_${payload.userId}_${randomUUID()}`,
  });
}


export async function addDeleteCloudinaryAssetsJob(
  payload: DeleteCloudinaryAssetsJobPayload
): Promise<void> {
  await imageQueue.add(JOB_NAMES.IMAGE.DELETE_CLOUDINARY_ASSETS, payload, {
    jobId: `del_img_${payload.productId ?? "misc"}_${randomUUID()}`,
  });
}
