import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
          const project = await prisma.project.findUnique({
            where: { id },
            include: { jobs: true },
          });

          if (!project) {
            send("error", { message: "Project tidak ditemukan." });
          } else {
            const payload = JSON.stringify(serializeProject(project));
            if (payload !== lastPayload) {
              lastPayload = payload;
              send("project", JSON.parse(payload));
            }
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
      const interval = setInterval(() => void tick(), 1_000);

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
    cancel() {
      // The request signal handler owns cleanup; this is a safety net.
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
