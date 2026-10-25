import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isComputingEntity } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, modelId = "auto", customScript } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const trimmedTopic = topic.trim();
    const isComputing = isComputingEntity(trimmedTopic);

    // 1. Create or register VideoJob in database with status STREAMING
    const job = await prisma.videoJob.create({
      data: {
        topic: trimmedTopic,
        modelId: modelId || "auto",
        status: "STREAMING",
        currentStage: "REALTIME_STREAM",
        progress: 10,
      },
    });

    // 2. Dispatch to FastAPI stream-engine
    const streamEngineUrl =
      process.env.STREAM_ENGINE_URL || "http://localhost:8000";

    try {
      await fetch(`${streamEngineUrl}/api/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          topic: trimmedTopic,
          model_id: modelId,
          custom_script: customScript,
        }),
      });
    } catch (engineErr: any) {
      console.warn(
        `[STREAM_ROUTER] FastAPI stream engine trigger notice: ${engineErr.message}`
      );
    }

    const wsUrl = `/ws/stream/${job.id}`;

    return NextResponse.json({
      job,
      streamWsUrl: wsUrl,
      isComputingEntity: isComputing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to initiate stream" },
      { status: 500 }
    );
  }
}
