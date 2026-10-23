import IORedis, { type RedisOptions } from "ioredis";
import { env } from "./env";

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

declare global {
  // eslint-disable-next-line no-var
  var __pabrikRedis: IORedis | undefined;
}

export function getRedisClient(): IORedis {
  if (!global.__pabrikRedis) {
    global.__pabrikRedis = new IORedis(env.REDIS_URL, redisConnectionOptions);
    global.__pabrikRedis.on("error", (err) => {
      console.error("[Redis Error]:", err.message);
    });
  }
  return global.__pabrikRedis;
}

export function createWorkerRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, redisConnectionOptions);
}

export const JOB_STATE_KEY_PREFIX = "pabrik:job:";
export const JOB_INDEX_KEY = "pabrik:jobs:index";
export const JOB_EVENTS_CHANNEL_PREFIX = "pabrik:events:";

export function getJobRedisKey(jobId: string): string {
  return `${JOB_STATE_KEY_PREFIX}${jobId}`;
}

export function getJobEventsChannel(jobId: string): string {
  return `${JOB_EVENTS_CHANNEL_PREFIX}${jobId}`;
}
