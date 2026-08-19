import { Job, Worker } from "bullmq";
import { JOB_NAMES, QUEUE_NAMES } from "../../constants/queue";
import { processBannerImagesJob, processProductImagesJob } from "../processors/image.processor";
import { redisConnection } from "../redis/connection";

export const imageWorker = new Worker(
  QUEUE_NAMES.IMAGE,
  async (job: Job<any>) => {
    switch (job.name) {
      case JOB_NAMES.IMAGE.PROCESS_PRODUCT_IMAGES:
        return await processProductImagesJob(job);
      case JOB_NAMES.IMAGE.PROCESS_BANNER_IMAGES:
        return await processBannerImagesJob(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 4, // Process 4 image jobs in parallel
    lockDuration: 60000, // 60s lock
  }
);

imageWorker.on("completed", (job) => {
  console.log(`[Image Worker] Job ${job.id} completed.`);
});

imageWorker.on("failed", (job, err) => {
  console.error(`[Image Worker] Job ${job?.id} failed: ${err.message}`);
});
