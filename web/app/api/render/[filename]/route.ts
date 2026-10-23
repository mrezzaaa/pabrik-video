import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getCurrentJob } from '@/lib/pabrik/jobManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureMp4Built(filename: string): string {
  const outDir = path.join(process.cwd(), '../out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targetMp4 = path.join(outDir, filename);
  if (fs.existsSync(targetMp4) && fs.statSync(targetMp4).size > 1000) {
    return targetMp4;
  }

  const job = getCurrentJob();
  const state = job?.result;
  const durationSec = Math.max(10, Math.round(state?.ttsData?.durationSeconds || 28));
  const audioRel = state?.ttsData?.audioUrl;
  const audioFull = audioRel ? path.join(process.cwd(), 'public', audioRel.replace(/^\//, '')) : '';

  const hasAudio = audioFull && fs.existsSync(audioFull);

  if (hasAudio) {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=#F4F5F7:s=1080x1920:r=30:d=${durationSec}" -i "${audioFull}" -c:v libx264 -pix_fmt yuv420p -preset ultrafast -c:a aac -b:a 128k -shortest "${targetMp4}"`,
      { stdio: 'ignore' }
    );
  } else {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=#F4F5F7:s=1080x1920:r=30:d=${durationSec}" -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${durationSec} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -c:a aac "${targetMp4}"`,
      { stdio: 'ignore' }
    );
  }

  return targetMp4;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeName = (filename || 'pabrik-bedah.mp4').replace(/[^a-zA-Z0-9._-]/g, '');
    const mp4Path = ensureMp4Built(safeName);

    const fileBuffer = fs.readFileSync(mp4Path);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menyiapkan file MP4' },
      { status: 500 }
    );
  }
}
