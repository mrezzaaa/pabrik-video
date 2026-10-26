import type { Job, Project } from "@prisma/client";
import type {
  FullScript,
  JobDTO,
  JobType,
  ProjectDTO,
  ResearchData,
  VisualPlan,
  WordTimestamp,
} from "./types";

type ProjectWithJobs = Project & { jobs: Job[] };

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeJob(job: Job): JobDTO {
  return {
    id: job.id,
    type: job.type as JobType,
    status: job.status,
    attempts: job.attempts,
    error: job.error,
    startedAt: iso(job.startedAt),
    finishedAt: iso(job.finishedAt),
    createdAt: job.createdAt.toISOString(),
  };
}

export function serializeProject(project: ProjectWithJobs): ProjectDTO {
  return {
    id: project.id,
    topic: project.topic,
    status: project.status,
    hook: project.hook,
    fullScript: (project.fullScript as unknown as FullScript) ?? null,
    researchData: (project.researchData as unknown as ResearchData) ?? null,
    visualPlan: (project.visualPlan as unknown as VisualPlan) ?? null,
    wordTimestamps:
      (project.wordTimestamps as unknown as WordTimestamp[]) ?? null,
    audioUrl: project.audioUrl,
    videoUrl: project.videoUrl,
    thumbnailUrl: project.thumbnailUrl,
    duration: project.duration,
    error: project.error,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    jobs: [...project.jobs]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(serializeJob),
  };
}
