import { NextResponse } from "next/server";
import { z } from "zod";
import { resetFromStage } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";
import { JOB_TYPES, type JobType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  from: z
    .enum(["research", "scriptwriting", "tts", "visual-planning", "render"])
    .default("tts"),
  force: z.boolean().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // empty body -> default tts
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stage rerun tidak valid." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: { jobs: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "Project tidak ditemukan." },
      { status: 404 },
    );
  }

  const busy = project.jobs.some((job) => job.status === "ACTIVE");
  if (busy && !parsed.data.force) {
    return NextResponse.json(
      { error: "Pipeline masih jalan. Gunakan opsi force untuk merestart jika job stuck." },
      { status: 409 },
    );
  }

  const from = parsed.data.from as JobType;
  if (!JOB_TYPES.includes(from)) {
    return NextResponse.json({ error: "Stage tidak dikenal." }, { status: 400 });
  }

  try {
    await resetFromStage(id, from);
    const updated = await prisma.project.findUnique({
      where: { id },
      include: { jobs: true },
    });
    return NextResponse.json({
      project: updated ? serializeProject(updated) : null,
      queued: from,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menjadwalkan ulang.",
      },
      { status: 503 },
    );
  }
}
