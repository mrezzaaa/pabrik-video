export const PROJECT_STATUSES = [
  "QUEUED",
  "RESEARCHING",
  "SCRIPTING",
  "TTS_PROCESSING",
  "VISUAL_PLANNING",
  "RENDERING",
  "DONE",
  "FAILED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const JOB_TYPES = [
  "research",
  "scriptwriting",
  "tts",
  "visual-planning",
  "render",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED";

export const JOB_LABELS: Record<JobType, string> = {
  research: "Pencari Materi",
  scriptwriting: "Pembuat Narasi",
  tts: "Voice Engine",
  "visual-planning": "Visual Planner",
  render: "Render Reels",
};

export const JOB_SHORT_LABELS: Record<JobType, string> = {
  research: "RESEARCH",
  scriptwriting: "SCRIPT",
  tts: "TTS",
  "visual-planning": "VISUAL",
  render: "RENDER",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  QUEUED: "Antre",
  RESEARCHING: "Riset",
  SCRIPTING: "Naskah",
  TTS_PROCESSING: "Suara",
  VISUAL_PLANNING: "Visual",
  RENDERING: "Render",
  DONE: "Siap Upload",
  FAILED: "Gagal",
};

export const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  QUEUED: 4,
  RESEARCHING: 18,
  SCRIPTING: 34,
  TTS_PROCESSING: 52,
  VISUAL_PLANNING: 68,
  RENDERING: 84,
  DONE: 100,
  FAILED: 100,
};

export interface ResearchData {
  facts: string[];
  sources: { title: string; url: string }[];
  uniqueAngles: string[];
  viralPotential: string;
  controversy?: string;
  numbers?: string[];
}

export type ScriptEmotion = "shocking" | "curious" | "excited";

export interface ScriptSentence {
  id: string;
  text: string;
  emphasisWords: string[];
  emotion: ScriptEmotion;
}

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  emphasis?: boolean;
  sentenceId?: string;
}

export interface CaptionPage {
  text: string;
  words: CaptionWord[];
}

export interface FullScript {
  hook: string;
  script: string;
  sentences: ScriptSentence[];
  captions: CaptionPage[];
  durationEstimate: number;
  generatedAt?: string;
}

export interface WordTimestamp extends CaptionWord {
  sentenceId: string;
  emphasis: boolean;
}

export type MotionType = "zoomIn" | "zoomOut" | "shake" | "pan" | "panLeft";
export type TextAnimationType = "karaoke" | "popIn" | "typewriter";

export interface NumberCounter {
  value: number;
  suffix?: string;
  prefix?: string;
}

export interface SceneOverlay {
  bigEmoji?: string;
  textHook?: string;
  counter?: NumberCounter;
}

export type StampWord = "MITOS" | "FAKTA" | "BAHAYA" | "AMAN";

/** Visual bertipe yang membuktikan isi kalimat narasi (dirender di Remotion). */
export type SceneVisual =
  | { kind: "stat"; value: number; prefix: string; suffix: string; label: string }
  | {
      kind: "compare";
      left: { title: string; items: string[] };
      right: { title: string; items: string[] };
    }
  | { kind: "stamp"; word: StampWord; caption: string }
  | {
      kind: "crosssection";
      title: string;
      layers: { label: string; note: string }[];
    }
  | { kind: "timeline"; steps: { label: string; detail: string }[] };

export interface VisualScene {
  id: string;
  startTime: number;
  endTime: number;
  /** Explicit scene length (seconds). Kept <= 2.5 by the visual planner. */
  duration?: number;
  background: {
    type: "gradient" | "solid" | "video";
    value: string;
    /** Gradient used when a video background cannot be loaded. */
    fallback?: string;
    videoUrl?: string;
  };
  motion: {
    type: MotionType;
    intensity: number;
  };
  kenBurns?: boolean;
  textAnimation: {
    type: TextAnimationType;
  };
  bRollKeywords: string[];
  overlayEmoji: string;
  overlay?: SceneOverlay;
  /** Visual utama scene. Kalau ada, counter/textHook disembunyikan. */
  visual?: SceneVisual;
  /** Detik sejak kalimat mulai (visual lanjut mulus antar potongan 2.5s). */
  visualOffset?: number;
  /** false = bukan potongan terakhir kalimat, jangan fade-out. */
  visualFinal?: boolean;
  headline: string;
  accentColor: string;
}

export interface VisualPlan {
  scenes: VisualScene[];
  vibe?: string;
  generatedAt?: string;
}

export interface JobDTO {
  id: string;
  type: JobType;
  status: JobStatus;
  attempts: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  topic: string;
  status: ProjectStatus;
  hook: string | null;
  fullScript: FullScript | null;
  researchData: ResearchData | null;
  visualPlan: VisualPlan | null;
  wordTimestamps: WordTimestamp[] | null;
  audioUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  jobs: JobDTO[];
}

export interface QueueSnapshot {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
