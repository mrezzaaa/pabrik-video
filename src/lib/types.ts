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

export type SceneTheme = "danger" | "warn" | "info" | "success";

/**
 * Center-stage visual modes. The stage never renders the spoken transcript:
 * it is either a real image or an animated data graphic with numbers and
 * short axis labels.
 */
export type VisualType =
  | "B_ROLL_IMAGE"
  | "SVG_GAUGE"
  | "SVG_BAR_CHART"
  | "SVG_COUNTER"
  | "SVG_WAVEFORM";

export type ImageFrameStyle = "fullBleed" | "split" | "glass";

export interface SceneMetric {
  value: number;
  suffix?: string;
  label?: string;
}

export interface SceneRange {
  from: number;
  to: number;
  min: number;
  max: number;
  unit?: string;
  label?: string;
}

export interface SceneBar {
  label: string;
  value: number;
  unit?: string;
  highlight?: boolean;
}

export interface SceneWave {
  label?: string;
  /** Normalized x position (0-1) where the line drops/flatlines. */
  dip: number;
}

export interface SceneCounter {
  from: number;
  to: number;
  suffix?: string;
  label?: string;
}

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
  /** Center-stage mode. Missing = no stage visual (background only). */
  visualType?: VisualType;
  /** Local public URL of the downloaded SearXNG image. */
  imageUrl?: string;
  /** English/Indonesian query used to fetch the real image. */
  imageSearchQuery?: string;
  imageStyle?: ImageFrameStyle;
  /** 1-2 word axis label. Never a sentence or transcript. */
  stageLabel?: string;
  metric?: SceneMetric;
  counter?: SceneCounter;
  range?: SceneRange;
  bars?: SceneBar[];
  wave?: SceneWave;
  /** Drives SFX + color treatment (danger scenes get impacts/red). */
  theme?: SceneTheme;
  /** Detik sejak kalimat mulai (visual lanjut mulus antar potongan 2.5s). */
  visualOffset?: number;
  /** false = bukan potongan terakhir kalimat, jangan fade-out. */
  visualFinal?: boolean;
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
