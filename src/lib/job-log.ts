import { prisma } from "./prisma";

export async function logTelemetry(
  jobId: string,
  stage: string,
  message: string,
  level: "INFO" | "WARN" | "ERROR" = "INFO",
  metadata?: any
) {
  try {
    await prisma.jobLog.create({
      data: {
        jobId,
        stage,
        level,
        message,
        metadata: metadata ? metadata : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write job log:", err);
  }
}
