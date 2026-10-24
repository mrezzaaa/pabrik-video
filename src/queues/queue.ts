import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const VIDEO_PIPELINE_QUEUE_NAME = "video-pipeline-queue";

export interface VideoJobData {
  jobId: string;
  topic: string;
  modelId: string;
  pexelsApiKey?: string;
}

export const videoPipelineQueue = new Queue<VideoJobData>(
  VIDEO_PIPELINE_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  }
);
