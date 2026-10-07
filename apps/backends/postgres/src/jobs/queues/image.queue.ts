import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../constants/queue";
import { redisConnection } from "../redis/connection";


export const imageQueue = new Queue(QUEUE_NAMES.IMAGE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry transient failures up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 10s, 20s backoff
    },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
  },
});
