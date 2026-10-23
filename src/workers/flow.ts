import { FlowProducer, Queue } from "bullmq";
import { redisConnectionOptions } from "@/config/redis";
import { createInitialJobState } from "@/services/job-store";

export const QUEUE_NAMES = {
  DECONSTRUCTOR: "agent-1-deconstructor",
  SCRIPTWRITER: "agent-2-scriptwriter",
  TTS: "agent-3-tts",
  VISUAL: "agent-4-visual",
  RENDERER: "agent-5-renderer",
} as const;

export interface PipelineJobPayload {
  jobId: string;
  topic: string;
  aspectRatioMode?: "LANDSCAPE_16_9" | "SHORTS_9_16";
  autoRenderMp4?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __pabrikFlowProducer: FlowProducer | undefined;
}

export function getFlowProducer(): FlowProducer {
  if (!global.__pabrikFlowProducer) {
    global.__pabrikFlowProducer = new FlowProducer({
      connection: redisConnectionOptions,
    });
  }
  return global.__pabrikFlowProducer;
}

/**
 * Enqueues the 5-Agent Directed Acyclic Graph (DAG) via BullMQ FlowProducer.
 * In BullMQ FlowProducer, child jobs execute before their parent job:
 * Leaf (Agent 1: Deconstructor) -> Agent 2: Scriptwriter -> Agent 3: TTS -> Agent 4: Visual -> Root (Agent 5: Renderer)
 */
export async function enqueueVideoFactoryFlow(params: PipelineJobPayload) {
  const {
    jobId,
    topic,
    aspectRatioMode = "SHORTS_9_16",
    autoRenderMp4 = true,
  } = params;

  await createInitialJobState({
    jobId,
    topic,
    aspectRatioMode,
  });

  const flowProducer = getFlowProducer();

  const flowTree = await flowProducer.add({
    name: "render-final-mp4",
    queueName: QUEUE_NAMES.RENDERER,
    data: { jobId, topic, aspectRatioMode, autoRenderMp4 },
    opts: {
      jobId: `${jobId}__renderer`,
      attempts: 2,
      removeOnComplete: false,
      removeOnFail: false,
    },
    children: [
      {
        name: "choreograph-isometric-visuals",
        queueName: QUEUE_NAMES.VISUAL,
        data: { jobId, topic, aspectRatioMode },
        opts: {
          jobId: `${jobId}__visual`,
          attempts: 2,
          removeOnComplete: false,
          removeOnFail: false,
        },
        children: [
          {
            name: "synthesize-tts-audio",
            queueName: QUEUE_NAMES.TTS,
            data: { jobId, topic, aspectRatioMode },
            opts: {
              jobId: `${jobId}__tts`,
              attempts: 2,
              removeOnComplete: false,
              removeOnFail: false,
            },
            children: [
              {
                name: "architect-script-telemetry",
                queueName: QUEUE_NAMES.SCRIPTWRITER,
                data: { jobId, topic, aspectRatioMode },
                opts: {
                  jobId: `${jobId}__scriptwriter`,
                  attempts: 2,
                  removeOnComplete: false,
                  removeOnFail: false,
                },
                children: [
                  {
                    name: "deconstruct-topic-blueprint",
                    queueName: QUEUE_NAMES.DECONSTRUCTOR,
                    data: { jobId, topic, aspectRatioMode },
                    opts: {
                      jobId: `${jobId}__deconstructor`,
                      attempts: 2,
                      removeOnComplete: false,
                      removeOnFail: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  return flowTree;
}

/**
 * Triggers Agent 5 (Remotion Render Worker) directly on demand from the Studio UI
 */
export async function enqueueStandaloneRenderJob(jobId: string, topic: string) {
  const renderQueue = new Queue(QUEUE_NAMES.RENDERER, {
    connection: redisConnectionOptions,
  });

  await renderQueue.add(
    "manual-render-mp4",
    {
      jobId,
      topic,
      autoRenderMp4: true,
    },
    {
      jobId: `${jobId}__manual_render_${Date.now()}`,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
}
