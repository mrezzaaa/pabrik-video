import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Service = {
  name: string;
  ok: boolean;
  detail: string;
  latencyMs: number;
};

async function timed(
  name: string,
  check: () => Promise<string>,
): Promise<Service> {
  const started = Date.now();
  try {
    const detail = await check();
    return { name, ok: true, detail, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - started,
    };
  }
}

async function httpOk(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(4_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

export async function GET() {
  const [database, redis, worker, searxng, omniroute, voicestudio] =
    await Promise.all([
      timed("postgres", async () => {
        await prisma.$queryRaw`SELECT 1`;
        return "connected";
      }),
      timed("redis", async () => {
        const pong = await getRedisConnection().ping();
        return pong;
      }),
      timed("worker", async () => {
        const heartbeat = await getRedisConnection().get(
          "pabrik:video:worker:heartbeat",
        );
        if (!heartbeat) throw new Error("worker belum pernah online");
        const age = Date.now() - Number(heartbeat);
        if (age > 20_000) throw new Error("heartbeat kedaluwarsa");
        return `${Math.round(age / 1000)}s lalu`;
      }),
      timed("searxng", async () => {
        await httpOk(
          `${env.searxngUrl}/search?q=test&format=json&language=id-ID`,
        );
        return env.searxngUrl;
      }),
      timed("omniroute", async () => {
        await httpOk(`${env.omnirouteBaseUrl}/models`, {
          headers: { Authorization: `Bearer ${env.omnirouteApiKey}` },
        });
        return `${env.omnirouteBaseUrl} (${env.primaryModel})`;
      }),
      timed("voicestudio", async () => {
        const root = env.voiceStudioBaseUrl.replace(/\/v1$/, "");
        await httpOk(`${root}/health`);
        return `${env.voiceStudioBaseUrl} (${env.voiceName})`;
      }),
    ]);

  const services = [
    database,
    redis,
    worker,
    searxng,
    omniroute,
    voicestudio,
  ];
  const coreUp = database.ok && redis.ok && worker.ok;

  return NextResponse.json({
    status: coreUp ? (services.every((service) => service.ok) ? "ok" : "degraded") : "down",
    services,
    queueName: env.queueName,
    timestamp: new Date().toISOString(),
  });
}
