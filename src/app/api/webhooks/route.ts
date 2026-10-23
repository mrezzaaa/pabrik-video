import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureWorkersRunning } from "@/workers";
import { enqueueStandaloneRenderJob } from "@/workers/flow";
import { getJobState, updateJobState } from "@/services/job-store";

export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  jobId: z.string().min(1),
  action: z.enum(["TRIGGER_RENDER", "WORKER_CALLBACK", "UPDATE_PROPS"]),
  agent: z.string().optional(),
  level: z.enum(["INFO", "SUCCESS", "WARN", "ERROR"]).optional(),
  message: z.string().optional(),
  compositionProps: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    ensureWorkersRunning();

    const body = await req.json();
    const parsed = webhookSchema.parse(body);

    const existing = await getJobState(parsed.jobId);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    if (parsed.action === "TRIGGER_RENDER") {
      await enqueueStandaloneRenderJob(parsed.jobId, existing.topic);
      return NextResponse.json({
        ok: true,
        message: "Agent 5 Remotion Render Worker triggered in BullMQ.",
      });
    }

    if (parsed.action === "UPDATE_PROPS" && parsed.compositionProps) {
      const updated = await updateJobState(
        parsed.jobId,
        () => ({
          compositionProps: parsed.compositionProps,
        }),
        {
          agent: "STUDIO_INSPECTOR",
          level: "INFO",
          message: "Updated RemotionCompositionProps JSON via Studio Inspector.",
        }
      );
      return NextResponse.json({ ok: true, job: updated });
    }

    const updated = await updateJobState(
      parsed.jobId,
      () => ({}),
      {
        agent: parsed.agent || "WEBHOOK",
        level: parsed.level || "INFO",
        message: parsed.message || "Worker callback received",
      }
    );

    return NextResponse.json({ ok: true, job: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook payload";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
