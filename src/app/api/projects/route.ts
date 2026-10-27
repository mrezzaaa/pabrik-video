import { NextResponse } from "next/server";
import { z } from "zod";
import { createProject } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(4, "Topik minimal 4 karakter.")
    .max(200, "Topik maksimal 200 karakter."),
  model: z.string().trim().max(100).optional().nullable(),
  voice: z.string().trim().max(100).optional().nullable(),
});

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { jobs: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    projects: projects.map(serializeProject),
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body harus berupa JSON." },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Topik tidak valid." },
      { status: 400 },
    );
  }

  try {
    const project = await createProject(
      parsed.data.topic,
      parsed.data.model,
      parsed.data.voice,
    );
    return NextResponse.json(
      { project: serializeProject(project) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat project / antrean.",
      },
      { status: 503 },
    );
  }
}
