import { NextResponse } from "next/server";
import { getQueueSnapshot } from "@/lib/queue";
import { getRedisConnection } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_KEY = "pabrik:video:worker:heartbeat";

async function status() {
  const redis = getRedisConnection();

  const [heartbeatRaw, queue] = await Promise.all([
    redis.get(HEARTBEAT_KEY).catch(() => null),
    getQueueSnapshot().catch(() => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    })),
  ]);

  const heartbeat = heartbeatRaw ? Number(heartbeatRaw) : 0;
  const online = heartbeat > 0 && Date.now() - heartbeat < 20_000;

  return {
    worker: {
      online,
      lastHeartbeat: heartbeat ? new Date(heartbeat).toISOString() : null,
    },
    queue,
    note:
      "Worker berjalan sebagai proses terpisah: npm run worker (src/worker/index.ts).",
  };
}

export async function GET() {
  try {
    return NextResponse.json(await status());
  } catch (error) {
    return NextResponse.json(
      {
        worker: { online: false, lastHeartbeat: null },
        error: error instanceof Error ? error.message : "Redis tidak tersedia.",
      },
      { status: 503 },
    );
  }
}

export async function POST() {
  return GET();
}
