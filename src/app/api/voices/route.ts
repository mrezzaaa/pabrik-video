import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listVoiceStudioVoices } from "@/lib/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const voices = await listVoiceStudioVoices();
  return NextResponse.json({
    defaultVoice: env.voiceDefaultId,
    defaultVoiceName: env.voiceName,
    voices,
  });
}
