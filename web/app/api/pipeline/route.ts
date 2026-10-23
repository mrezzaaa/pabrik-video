import { NextRequest, NextResponse } from 'next/server';
import { getCurrentJob, startOrAttachJob, subscribeToJob } from '@/lib/pabrik/jobManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'start'; // 'state' | 'resume' | 'start'
  const topicParam = searchParams.get('topic') || 'kenapa freon ac gak habis';

  // Snapshot check without SSE
  if (mode === 'state') {
    const job = getCurrentJob();
    return NextResponse.json({ job });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const sendEvent = (event: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      const closeStream = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      };

      let job = getCurrentJob();

      // Resume mode: only attach if there is an existing job
      if (mode === 'resume') {
        if (!job) {
          sendEvent('idle', { message: 'Tidak ada proses aktif' });
          closeStream();
          return;
        }
      } else {
        // Start mode: if a job is currently running, attach to it; otherwise start a new job
        job = startOrAttachJob(topicParam);
      }

      // Send initial snapshot of buffered logs & current state
      sendEvent('sync', {
        jobId: job.id,
        topic: job.topic,
        status: job.status,
        logs: job.logs,
        result: job.result,
      });

      // If the job is already finished, complete immediately
      if (job.status === 'completed') {
        sendEvent('complete', {
          jobId: job.id,
          message: 'Video siap dipratinjau & diekspor',
          result: job.result,
        });
        closeStream();
        return;
      }

      if (job.status === 'error') {
        sendEvent('error', {
          jobId: job.id,
          message: job.error || 'Terjadi kesalahan pada pipeline',
        });
        closeStream();
        return;
      }

      // Otherwise job is running: subscribe to live events
      const unsubscribe = subscribeToJob((event, data) => {
        sendEvent(event, data);
        if (event === 'complete' || event === 'error') {
          unsubscribe();
          closeStream();
        }
      });

      // Clean up subscription if client refreshes or disconnects
      req.signal.addEventListener('abort', () => {
        unsubscribe();
        closeStream();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
