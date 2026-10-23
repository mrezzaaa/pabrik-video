export type Label = "RESMI" | "MEDIA" | "KOMUNITAS" | "DIMODELKAN";
export type Confidence = "tinggi" | "sedang" | "rendah";
export type Node = "script" | "visual" | "research";

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface Research {
  topic: string;
  hook: { question: string; short_answer: string };
  facts: {
    claim: string;
    label: Label;
    evidence: string;
    numbers: string[];
    source_index: number[];
    confidence: Confidence;
  }[];
  anatomy: {
    part: string;
    material: string;
    function: string;
    visual_accent: boolean;
    source_index: number[];
  }[];
  flow: string[];
  myths: { myth: string; origin: string; fact: string; source_index: number[] }[];
  anchor_numbers: { value: string; unit: string; context: string }[];
  gaps: string[];
}

export interface MetricState {
  id: string;
  value: number;
  readout?: string;
}

export interface Metric {
  label?: string;
  unit?: string;
  decimals?: number;
  warn_at?: number;
  danger_at?: number;
  states: MetricState[];
}

export interface BeatHud {
  state: string;
}

export interface Beat {
  beat_number: number;
  role: string;
  text: string;
  visual: string;
  sfx_keyword: string;
  tulisan_layar: string;
  source_refs: string[];
  hud?: BeatHud;
}

export interface Plan {
  beats: Beat[];
  metric?: Metric;
  // diisi oleh kode (finalizePlan), bukan LLM
  total_words?: number;
  narration_text?: string;
}

export interface Issue {
  beat: number;
  dimension: "hook" | "logika" | "tempo" | "visual" | "cerita" | "faktual";
  severity: "blocker" | "major" | "minor";
  quote: string;
  fix: string;
  node: Node;
}

export interface Gates {
  G1_faktual: boolean;
  G2_kepastian: boolean;
  G3_struktur: boolean;
  G4_hero_konsisten: boolean;
  G5_aman: boolean;
}

export interface Scores {
  hook: number;
  logika: number;
  tempo: number;
  visual: number;
  cerita: number;
}

export interface JudgeRaw {
  gates: Gates;
  issues: Issue[];
  scores: Scores;
  verdict: "APPROVED" | "REJECT";
  fix_node: string | null;
  feedback: string;
}

export interface JudgeResult {
  gates: Gates;
  scores: Scores;
  faktual: number;
  overall: number;
  status: "APPROVED" | "REJECT";
  fix_node: "script" | "visual" | "both" | "research" | null;
  issues: Issue[];
  feedback: string;
  runs: number;
}
