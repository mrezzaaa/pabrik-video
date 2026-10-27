import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { enqueueStage, removeStageJob, STAGE_SEQUENCE } from "./queue";
import type { JobType, ProjectStatus } from "./types";

const STAGE_STATUS: Record<JobType, ProjectStatus> = {
  research: "RESEARCHING",
  scriptwriting: "SCRIPTING",
  tts: "TTS_PROCESSING",
  "visual-planning": "VISUAL_PLANNING",
  render: "RENDERING",
};

export function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createProject(
  topic: string,
  model?: string | null,
  voice?: string | null,
) {
  const project = await prisma.project.create({
    data: {
      topic,
      model: model?.trim() || null,
      voice: voice?.trim() || null,
      status: "QUEUED",
      jobs: {
        create: STAGE_SEQUENCE.map((type) => ({
          type,
          status: "PENDING" as const,
        })),
      },
    },
    include: { jobs: true },
  });

  try {
    await enqueueStage(project.id, "research");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal masuk antrean Redis.";
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "FAILED", error: message },
    });
    await prisma.job.updateMany({
      where: { projectId: project.id, type: "research" },
      data: { status: "FAILED", error: message },
    });
    throw new Error(`Project dibuat, tetapi antrean gagal: ${message}`);
  }

  return project;
}

export async function startStage(projectId: string, stage: JobType) {
  const [, project] = await prisma.$transaction([
    prisma.job.updateMany({
      where: { projectId, type: stage },
      data: {
        status: "ACTIVE",
        attempts: { increment: 1 },
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: STAGE_STATUS[stage], error: null },
    }),
  ]);
  return project;
}

export async function completeStage(
  projectId: string,
  stage: JobType,
  result?: unknown,
) {
  const next = STAGE_SEQUENCE[STAGE_SEQUENCE.indexOf(stage) + 1];

  // Enqueue before marking complete: a Redis hiccup should retry this job,
  // not leave the pipeline stranded with a completed stage and no successor.
  if (next) {
    await enqueueStage(projectId, next);
  }

  await prisma.job.updateMany({
    where: { projectId, type: stage },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      error: null,
      ...(result === undefined ? {} : { result: asJson(result) }),
    },
  });
}

export async function failStage(
  projectId: string,
  stage: JobType,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.job.updateMany({
    where: { projectId, type: stage },
    data: { status: "FAILED", error: message, finishedAt: new Date() },
  });
}

export async function failProject(
  projectId: string,
  stage: JobType | null,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "FAILED", error: message.slice(0, 2000) },
  });
  if (stage) {
    await failStage(projectId, stage, message);
  }
}

export async function resetFromStage(projectId: string, fromStage: JobType) {
  const startIndex = STAGE_SEQUENCE.indexOf(fromStage);
  if (startIndex === -1) throw new Error(`Stage tidak dikenal: ${fromStage}`);

  const stages = STAGE_SEQUENCE.slice(startIndex);

  await prisma.job.updateMany({
    where: { projectId, type: { in: stages } },
    data: {
      status: "PENDING",
      error: null,
      result: Prisma.DbNull,
      startedAt: null,
      finishedAt: null,
      attempts: 0,
    },
  });

  const data: Prisma.ProjectUpdateInput = {
    status: "QUEUED",
    error: null,
  };

  if (startIndex <= STAGE_SEQUENCE.indexOf("tts")) {
    data.audioUrl = null;
    data.videoUrl = null;
    data.thumbnailUrl = null;
    data.duration = null;
    data.wordTimestamps = Prisma.DbNull;
  }
  if (startIndex <= STAGE_SEQUENCE.indexOf("scriptwriting")) {
    data.fullScript = Prisma.DbNull;
    data.hook = null;
  }
  if (startIndex <= STAGE_SEQUENCE.indexOf("research")) {
    data.researchData = Prisma.DbNull;
  }
  if (startIndex <= STAGE_SEQUENCE.indexOf("visual-planning")) {
    data.visualPlan = Prisma.DbNull;
    data.videoUrl = null;
    data.thumbnailUrl = null;
  }
  if (startIndex <= STAGE_SEQUENCE.indexOf("render")) {
    data.videoUrl = null;
    data.thumbnailUrl = null;
  }

  await prisma.project.update({ where: { id: projectId }, data });

  await Promise.all(stages.map((stage) => removeStageJob(projectId, stage)));
  await enqueueStage(projectId, fromStage, { force: true });
}

/** Give the worker a tiny bit of headroom when a stage is retried by BullMQ. */
export async function prepareRetry(projectId: string, stage: JobType) {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: STAGE_STATUS[stage], error: null },
  });
}

export async function getProjectForWorker(
  prismaClient: PrismaClient,
  projectId: string,
) {
  return prismaClient.project.findUnique({
    where: { id: projectId },
    include: { jobs: true },
  });
}
