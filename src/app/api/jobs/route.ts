import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureWorkersRunning } from "@/workers";
import { enqueueVideoFactoryFlow } from "@/workers/flow";
import { getJobState, listRecentJobs } from "@/services/job-store";
import { createWorkerRedisConnection, getJobEventsChannel } from "@/config/redis";

export const dynamic = "force-dynamic";

const createJobBodySchema = z.object({
  topic: z.string().min(3, "Topic minimal 3 karakter"),
  aspectRatioMode: z
    .enum(["LANDSCAPE_16_9", "SHORTS_9_16"])
    .optional()
    .default("LANDSCAPE_16_9"),
  autoRenderMp4: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // Boot BullMQ workers idempotently so local dev & production work seamlessly
    ensureWorkersRunning();

    const json = await req.json();
    const parsed = createJobBodySchema.parse(json);

    const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    await enqueueVideoFactoryFlow({
      jobId,
      topic: parsed.topic.trim(),
      aspectRatioMode: parsed.aspectRatioMode,
      autoRenderMp4: parsed.autoRenderMp4,
    });

    const jobState = await getJobState(jobId);

    return NextResponse.json(
      {
        ok: true,
        jobId,
        job: jobState,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request payload";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  ensureWorkersRunning();

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const isStream = searchParams.get("stream") === "true" || searchParams.get("stream") === "1";

  // 1. Server-Sent Events (SSE) real-time stream for a specific jobId
  if (jobId && isStream) {
    const encoder = new TextEncoder();
    const subRedis = createWorkerRedisConnection();
    const channel = getJobEventsChannel(jobId);

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // stream closed
          }
        };

        // Send initial state immediately
        const initial = await getJobState(jobId);
        if (initial) {
          sendEvent(initial);
        }

        await subRedis.subscribe(channel);
        subRedis.on("message", (_chan, message) => {
          try {
            sendEvent(JSON.parse(message));
          } catch {
            // ignore malformed event
          }
        });

        req.signal.addEventListener("abort", () => {
          void subRedis.unsubscribe(channel);
          subRedis.disconnect();
          try {
            controller.close();
          } catch {
            // ignore
          }
        });
      },
      cancel() {
        subRedis.disconnect();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // 2. Single job JSON status
  if (jobId) {
    const job = await getJobState(jobId);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, job });
  }

  // 3. List recent jobs in queue
  const jobs = await listRecentJobs(25);
  return NextResponse.json({ ok: true, jobs });
}
