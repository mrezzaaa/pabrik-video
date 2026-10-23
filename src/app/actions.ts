"use server";

import { ensureWorkersRunning } from "@/workers";
import { enqueueVideoFactoryFlow, enqueueStandaloneRenderJob } from "@/workers/flow";
import { getJobState } from "@/services/job-store";

export async function createVideoFactoryJobAction(formData: {
  topic: string;
  aspectRatioMode?: "LANDSCAPE_16_9" | "SHORTS_9_16";
  autoRenderMp4?: boolean;
}) {
  ensureWorkersRunning();

  const cleanTopic = formData.topic.trim();
  if (!cleanTopic || cleanTopic.length < 3) {
    throw new Error("Masukkan topik minimal 3 karakter.");
  }

  const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  await enqueueVideoFactoryFlow({
    jobId,
    topic: cleanTopic,
    aspectRatioMode: formData.aspectRatioMode ?? "SHORTS_9_16",
    autoRenderMp4: formData.autoRenderMp4 ?? true,
  });

  const state = await getJobState(jobId);
  return { jobId, job: state };
}

export async function triggerStudioRenderAction(jobId: string) {
  ensureWorkersRunning();

  const state = await getJobState(jobId);
  if (!state) {
    throw new Error(`Job ${jobId} tidak ditemukan.`);
  }

  await enqueueStandaloneRenderJob(jobId, state.topic);
  return { ok: true };
}
