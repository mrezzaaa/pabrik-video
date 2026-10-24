import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { videoPipelineQueue } from "@/queues/queue";

export async function GET() {
  try {
    const jobs = await prisma.videoJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, modelId = "auto", pexelsApiKey } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const job = await prisma.videoJob.create({
      data: {
        topic: topic.trim(),
        modelId: modelId || "auto",
        pexelsApiKey: pexelsApiKey ? pexelsApiKey.trim() : null,
        status: "PENDING",
        currentStage: "INIT",
        progress: 0,
      },
    });

    // Enqueue job to BullMQ
    await videoPipelineQueue.add(
      "generate-video",
      {
        jobId: job.id,
        topic: job.topic,
        modelId: job.modelId,
        pexelsApiKey: job.pexelsApiKey || undefined,
      },
      {
        jobId: job.id,
      }
    );

    return NextResponse.json({ job }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to submit job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit job" },
      { status: 500 }
    );
  }
}
