import { NextRequest } from 'next/server';
import { runPabrikPipeline } from '@/lib/pabrik/graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic') || 'kenapa freon ac gak habis';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        sendEvent('start', { topic, message: 'Memulai pipeline Pabrik Bedah...' });

        const finalState = await runPabrikPipeline(topic, (node, message, data) => {
          sendEvent('log', {
            node,
            message,
            timestamp: new Date().toISOString(),
            data
          });
        });

        sendEvent('complete', {
          message: 'Video siap dipratinjau & diekspor',
          result: finalState
        });
      } catch (err: any) {
        sendEvent('error', {
          message: err.message || 'Terjadi kesalahan pada pipeline'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
