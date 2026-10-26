import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureMediaDirs, TMP_DIR } from "@/lib/media";
import { synthesizeToFile } from "@/lib/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(1200),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Teks tidak valid." },
      { status: 400 },
    );
  }

  await ensureMediaDirs();
  const filePath = path.join(TMP_DIR, `tts-${randomUUID()}.mp3`);

  try {
    const result = await synthesizeToFile(parsed.data.text, filePath);
    const buffer = await fs.readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
        "X-TTS-Provider": result.provider,
        "X-TTS-Voice": result.voice,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS gagal." },
      { status: 502 },
    );
  } finally {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
  }
}
