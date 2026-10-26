import { NextResponse } from "next/server";
import { z } from "zod";
import { asJson } from "@/lib/pipeline";
import { splitNarration } from "@/lib/narration";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";
import type { FullScript, ScriptSentence } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  hook: z.string().trim().min(1).max(180).optional(),
  script: z.string().trim().min(20).max(2000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  return NextResponse.json({ project: serializeProject(project) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json(
      { error: "Project tidak ditemukan." },
      { status: 404 },
    );
  }

  const fullScript = project.fullScript as unknown as FullScript | null;
  const current: FullScript = fullScript ?? {
    hook: project.hook ?? "",
    script: "",
    sentences: [],
    captions: [],
    durationEstimate: 0,
  };

  let sentences = current.sentences;
  let script = current.script;

  if (parsed.data.script) {
    script = parsed.data.script;
    const oldEmphasis = new Set(
      current.sentences.flatMap((sentence) => sentence.emphasisWords),
    );
    sentences = splitNarration(script).map<ScriptSentence>((text, index) => ({
      id: `s${index + 1}`,
      text,
      emphasisWords: [...oldEmphasis]
        .filter((word) =>
          text.toLowerCase().includes(word.toLowerCase()),
        )
        .slice(0, 3),
      emotion:
        current.sentences[index]?.emotion ?? (index === 0 ? "shocking" : "curious"),
    }));
  }

  const hook = parsed.data.hook ?? project.hook ?? current.hook;

  await prisma.project.update({
    where: { id },
    data: {
      hook,
      fullScript: asJson({
        ...current,
        hook,
        script,
        sentences,
        captions: parsed.data.script ? [] : current.captions,
      } satisfies FullScript),
    },
  });

  const updated = await prisma.project.findUnique({
    where: { id },
    include: { jobs: true },
  });

  return NextResponse.json({
    project: updated ? serializeProject(updated) : null,
    requiresRerun: Boolean(parsed.data.script) && project.status === "DONE",
  });
}
