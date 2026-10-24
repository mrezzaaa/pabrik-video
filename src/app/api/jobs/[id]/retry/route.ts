import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { videoPipelineQueue } from "@/queues/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingJob = await prisma.videoJob.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset status to allow resumption
    const updatedJob = await prisma.videoJob.update({
      where: { id },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });

    // Re-enqueue job into BullMQ
    await videoPipelineQueue.add(
      "generate-video",
      {
        jobId: existingJob.id,
        topic: existingJob.topic,
        modelId: existingJob.modelId,
        pexelsApiKey: existingJob.pexelsApiKey || undefined,
      },
      {
        jobId: `${existingJob.id}-retry-${Date.now()}`,
      }
    );

    return NextResponse.json({
      message: "Job resumed from last completed stage",
      job: updatedJob,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retry job" },
      { status: 500 }
    );
  }
}
