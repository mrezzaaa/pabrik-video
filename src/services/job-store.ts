import {
  getRedisClient,
  getJobRedisKey,
  getJobEventsChannel,
  JOB_INDEX_KEY,
} from "@/config/redis";
import {
  type VideoJobState,
  type PipelineLogEntry,
  VideoJobStateSchema,
} from "@/schemas/video-blueprint";

export async function createInitialJobState(params: {
  jobId: string;
  topic: string;
  aspectRatioMode?: "SHORTS_9_16" | "LANDSCAPE_16_9";
}): Promise<VideoJobState> {
  const redis = getRedisClient();
  const now = new Date().toISOString();

  const initialState: VideoJobState = {
    jobId: params.jobId,
    topic: params.topic,
    aspectRatioMode: params.aspectRatioMode ?? "SHORTS_9_16",
    status: "QUEUED",
    progressPercent: 2,
    createdAt: now,
    updatedAt: now,
    steps: {
      deconstructor: "PENDING",
      scriptwriter: "PENDING",
      tts: "PENDING",
      visual: "PENDING",
      renderer: "PENDING",
    },
    logs: [
      {
        timestamp: now,
        agent: "ORCHESTRATOR",
        level: "INFO",
        message: `Job "${params.topic}" queued in BullMQ FlowProducer DAG pipeline.`,
      },
    ],
  };

  await redis.set(getJobRedisKey(params.jobId), JSON.stringify(initialState));
  await redis.zadd(JOB_INDEX_KEY, Date.now(), params.jobId);
  await publishJobUpdate(params.jobId, initialState);

  return initialState;
}

export async function getJobState(jobId: string): Promise<VideoJobState | null> {
  const redis = getRedisClient();
  const raw = await redis.get(getJobRedisKey(jobId));
  if (!raw) return null;
  try {
    return VideoJobStateSchema.parse(JSON.parse(raw));
  } catch {
    return JSON.parse(raw) as VideoJobState;
  }
}

export async function listRecentJobs(limit = 20): Promise<VideoJobState[]> {
  const redis = getRedisClient();
  const jobIds = await redis.zrevrange(JOB_INDEX_KEY, 0, limit - 1);
  if (!jobIds.length) return [];

  const keys = jobIds.map((id) => getJobRedisKey(id));
  const rawStates = await redis.mget(...keys);

  const states: VideoJobState[] = [];
  for (const raw of rawStates) {
    if (!raw) continue;
    try {
      states.push(JSON.parse(raw) as VideoJobState);
    } catch {
      // ignore corrupted entry
    }
  }
  return states;
}

export async function updateJobState(
  jobId: string,
  updater: (prev: VideoJobState) => Partial<VideoJobState>,
  logEntry?: Omit<PipelineLogEntry, "timestamp">
): Promise<VideoJobState | null> {
  const redis = getRedisClient();
  const current = await getJobState(jobId);
  if (!current) return null;

  const now = new Date().toISOString();
  const patch = updater(current);

  const updatedLogs = logEntry
    ? [
        ...current.logs,
        {
          timestamp: now,
          ...logEntry,
        },
      ]
    : patch.logs ?? current.logs;

  const nextState: VideoJobState = {
    ...current,
    ...patch,
    steps: {
      ...current.steps,
      ...(patch.steps ?? {}),
    },
    logs: updatedLogs,
    updatedAt: now,
  };

  await redis.set(getJobRedisKey(jobId), JSON.stringify(nextState));
  await publishJobUpdate(jobId, nextState);
  return nextState;
}

export async function publishJobUpdate(jobId: string, state: VideoJobState): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.publish(getJobEventsChannel(jobId), JSON.stringify(state));
  } catch (err) {
    console.warn("[JobStore] Failed publishing SSE event:", err);
  }
}
