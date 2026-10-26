import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastPayload = "";
      let lastHeartbeat = Date.now();

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const projects = await prisma.project.findMany({
            include: { jobs: true },
            orderBy: { createdAt: "desc" },
            take: 40,
          });
          const payload = JSON.stringify(projects.map(serializeProject));
          if (payload !== lastPayload) {
            lastPayload = payload;
            send("projects", JSON.parse(payload));
          }

          if (Date.now() - lastHeartbeat > 15_000) {
            lastHeartbeat = Date.now();
            if (!closed) {
              controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
            }
          }
        } catch (error) {
          send("stream-error", {
            message: error instanceof Error ? error.message : "Stream error",
          });
        }
      };

      void tick();
      const interval = setInterval(() => void tick(), 1_500);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
