import fs from 'fs';
import path from 'path';
import { PipelineState, runPabrikPipeline } from './graph';

export interface LogEntry {
  node: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface PipelineJob {
  id: string;
  topic: string;
  status: 'running' | 'completed' | 'error';
  logs: LogEntry[];
  result: PipelineState | null;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

type JobSubscriber = (event: string, data: any) => void;

interface GlobalStore {
  currentJob: PipelineJob | null;
  subscribers: Set<JobSubscriber>;
}

const globalForPabrik = globalThis as unknown as {
  __pabrikJobStore?: GlobalStore;
};

const STATE_FILE = path.join(process.cwd(), '../out/latest-job.json');

function loadPersistedJob(): PipelineJob | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PipelineJob;
      // If server restarted while job was marked 'running', mark as interrupted or keep completed
      if (parsed.status === 'running') {
        parsed.status = 'error';
        parsed.error = 'Server direstart saat proses berlangsung.';
      }
      return parsed;
    }
  } catch {
    // ignore read error
  }
  return null;
}

function savePersistedJob(job: PipelineJob | null) {
  if (!job) return;
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(job, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

function getStore(): GlobalStore {
  if (!globalForPabrik.__pabrikJobStore) {
    globalForPabrik.__pabrikJobStore = {
      currentJob: loadPersistedJob(),
      subscribers: new Set<JobSubscriber>(),
    };
  }
  return globalForPabrik.__pabrikJobStore;
}

function broadcast(event: string, data: any) {
  const store = getStore();
  for (const sub of store.subscribers) {
    try {
      sub(event, data);
    } catch {
      store.subscribers.delete(sub);
    }
  }
}

export function getCurrentJob(): PipelineJob | null {
  const store = getStore();
  if (!store.currentJob || store.currentJob.status !== 'running') {
    const persisted = loadPersistedJob();
    if (persisted) {
      store.currentJob = persisted;
    }
  }
  return store.currentJob;
}

export function subscribeToJob(fn: JobSubscriber): () => void {
  const store = getStore();
  store.subscribers.add(fn);
  return () => {
    store.subscribers.delete(fn);
  };
}

export function startOrAttachJob(topic: string, forceNew = false): PipelineJob {
  const store = getStore();

  // If there's already a running job, attach to it instead of starting a duplicate
  if (store.currentJob && store.currentJob.status === 'running' && !forceNew) {
    return store.currentJob;
  }

  const newJob: PipelineJob = {
    id: `job-${Date.now()}`,
    topic,
    status: 'running',
    logs: [],
    result: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.currentJob = newJob;
  savePersistedJob(newJob);

  broadcast('start', {
    jobId: newJob.id,
    topic: newJob.topic,
    message: 'Memulai pipeline Pabrik Bedah...',
  });

  // Execute pipeline asynchronously in background on server
  (async () => {
    try {
      const finalState = await runPabrikPipeline(topic, (node, message, data) => {
        const logItem: LogEntry = {
          node,
          message,
          timestamp: new Date().toISOString(),
          data,
        };
        newJob.logs.push(logItem);
        newJob.updatedAt = logItem.timestamp;
        savePersistedJob(newJob);
        broadcast('log', logItem);
      });

      newJob.status = 'completed';
      newJob.result = finalState;
      newJob.updatedAt = new Date().toISOString();
      savePersistedJob(newJob);

      broadcast('complete', {
        jobId: newJob.id,
        message: 'Video siap dipratinjau & diekspor',
        result: finalState,
      });
    } catch (err: any) {
      newJob.status = 'error';
      newJob.error = err?.message || 'Terjadi kesalahan pada pipeline';
      newJob.updatedAt = new Date().toISOString();
      savePersistedJob(newJob);

      broadcast('error', {
        jobId: newJob.id,
        message: newJob.error,
      });
    }
  })();

  return newJob;
}
