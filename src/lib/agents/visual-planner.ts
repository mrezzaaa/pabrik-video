import { ensureObjectModel } from "../explainer/anatomy";
import {
  genericModel,
  type ExplainerShot,
  type ObjectModel,
} from "../explainer/model";
import { chatJSON } from "../omniroute";
import { buildPlaybook } from "../skills/playbook";
import { grammarBrief, visualGrammarFor, type VisualGrammar } from "../skills/visual-grammar";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { visualPlanSchema, type VisualPlanOutput } from "../schemas";
import {
  axisLabel,
  normalizeCopy,
  stripEmoji,
} from "../text";
import {
  deriveCompare,
  deriveLayers,
  deriveStamp,
  deriveSteps,
} from "../visual-spec";
import type {
  FullScript,
  ImageFrameStyle,
  MotionType,
  SceneBar,
  SceneCompare,
  SceneCounter,
  SceneLayer,
  SceneMetric,
  SceneRange,
  SceneRole,
  SceneStamp,
  SceneStep,
  SceneTheme,
  SceneWave,
  ScriptSentence,
  TextAnimationType,
  TopicStyle,
  ResearchData,
  VisualPlan,
  VisualScene,
  VisualType,
  WordTimestamp,
} from "../types";
import {
  anchorImageQuery,
  type ImageHints,
  isVisualAllowed,
  NO_HINTS,
  readImageHints,
  resolveTopicStyle,
  visualSystemPromptFor,
} from "../topic-style";
import { GRADIENT_PALETTES } from "../viral";

const MOTIONS: MotionType[] = [
  "zoomIn",
  "zoomOut",
  "shake",
  "pan",
  "panLeft",
];
const ANIMATIONS: TextAnimationType[] = ["karaoke", "popIn", "typewriter"];
const ACCENTS = ["#39FF14", "#F5FF00", "#FF2E93", "#00D4FF", "#FF6A00"];
const IMAGE_STYLES: ImageFrameStyle[] = ["fullBleed", "glass", "split"];

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "ini",
  "itu",
  "untuk",
  "dengan",
  "adalah",
  "akan",
  "bisa",
  "gak",
  "nggak",
  "tidak",
  "kamu",
  "lu",
  "gue",
  "kita",
  "aku",
  "saya",
  "ada",
  "juga",
  "pada",
  "dalam",
  "atau",
  "karena",
  "jadi",
  "lebih",
  "paling",
  "sudah",
  "belum",
  "masih",
  "cuma",
  "banget",
  "padahal",
  "sekarang",
  "coba",
  "ingat",
]);

type Timing = { start: number; end: number };
type Candidate = VisualPlanOutput["scenes"][number];

function sentenceTimings(
  sentences: ScriptSentence[],
  words: WordTimestamp[],
  duration: number,
): Timing[] {
  const bySentence = new Map<string, WordTimestamp[]>();
  for (const word of words) {
    const list = bySentence.get(word.sentenceId) ?? [];
    list.push(word);
    bySentence.set(word.sentenceId, list);
  }

  const fallbackWeight = sentences.map((sentence) => sentence.text.length || 1);
  const totalWeight = fallbackWeight.reduce((sum, weight) => sum + weight, 0);
  let fallbackCursor = 0;

  return sentences.map((sentence, index) => {
    const list = bySentence.get(sentence.id) ?? [];
    if (list.length > 0) {
      return {
        start: list[0].start,
        end: Math.max(list[0].start + 0.2, list[list.length - 1].end),
      };
    }
    const slice = (fallbackWeight[index] / totalWeight) * duration;
    const timing = {
      start: fallbackCursor,
      end: fallbackCursor + slice,
    };
    fallbackCursor += slice;
    return timing;
  });
}

function hexToRgb(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return null;
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

/** Reject near-white / near-black / washed-out accent colors from the LLM. */
function pickAccent(value: string, index: number) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    const r = Number.parseInt(value.slice(1, 3), 16) / 255;
    const g = Number.parseInt(value.slice(3, 5), 16) / 255;
    const b = Number.parseInt(value.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (luminance > 0.12 && luminance < 0.86 && saturation > 0.35) {
      return value;
    }
  }
  return ACCENTS[index % ACCENTS.length];
}

function keywordsFor(sentence: ScriptSentence) {
  const words = sentence.text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  return [...new Set(words)].slice(0, 3);
}

function pickBackground(value: string, index: number) {
  if (
    value &&
    (value.startsWith("linear-gradient") ||
      value.startsWith("radial-gradient") ||
      /^#[0-9a-f]{6}$/i.test(value))
  ) {
    return value;
  }
  return GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
}

const SPOKEN_NUMBERS: Array<[RegExp, string]> = [
  [/\bdua belas\b/g, "12"],
  [/\bsebelas\b/g, "11"],
  [/\bsepuluh\b/g, "10"],
  [/\bsembilan\b/g, "9"],
  [/\bdelapan\b/g, "8"],
  [/\btujuh\b/g, "7"],
  [/\benam\b/g, "6"],
  [/\blima\b/g, "5"],
  [/\bempat\b/g, "4"],
  [/\btiga\b/g, "3"],
  [/\bdua\b/g, "2"],
  [/\bsatu\b/g, "1"],
  [/\bsetengah\b/g, "0.5"],
];

/**
 * Narration is TTS-safe, so numbers often arrive as words ("lima sampai
 * sepuluh jam"). Digitize a copy for parsing only; the spoken caption is
 * never mutated.
 */
function digitizeSpokenNumbers(text: string) {
  return SPOKEN_NUMBERS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text.toLowerCase(),
  );
}

function parseNumber(text: string) {
  const normalized = digitizeSpokenNumbers(text);
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(%|km\/jam|km|cm|mm|kg|gram|tahun|detik|menit|ruas|tulang|derajat|kali|jam|persen|responden|orang)?/i,
  );
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;

  let suffix = match[2] ?? "";
  if (!suffix) {
    const after = normalized
      .slice((match.index ?? 0) + match[0].length)
      .trim()
      .split(/\s+/)[0];
    if (after && /^[a-zA-Z%]{2,14}$/.test(after)) suffix = after;
  }

  const normalizedSuffix = suffix.toUpperCase();
  const displaySuffix =
    normalizedSuffix === "%"
      ? "%"
      : normalizedSuffix === "PERSEN"
        ? "%"
        : normalizedSuffix
          ? ` ${normalizedSuffix}`
          : "";

  return {
    value,
    suffix: displaySuffix,
    label: `${match[1]}${displaySuffix}`.slice(0, 24),
  };
}

function parseRange(text: string) {
  const normalized = digitizeSpokenNumbers(text);
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:sampai dengan|sampai|s\/d|hingga|-|–)\s*(\d+(?:[.,]\d+)?)\s*(jam|persen|%|tahun)?/i,
  );
  if (!match) return null;

  const from = Number(match[1].replace(",", "."));
  const to = Number(match[2].replace(",", "."));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return null;

  const unitRaw = (match[3] ?? "").toLowerCase();
  const unit = unitRaw === "persen" ? "%" : unitRaw.toUpperCase();
  const max = unit === "%" ? 100 : Math.max(12, Math.ceil(to * 1.25));
  return { from, to, min: 0, max, unit };
}

function narrationDigits(text: string) {
  return new Set(text.match(/\d+/g) ?? []);
}

function grounded(value: number, digits: Set<string>) {
  if (!Number.isFinite(value) || value <= 0) return false;
  const normalized = Number.isInteger(value) ? String(value) : String(value);
  return digits.has(normalized);
}

const DECLINE_PATTERN =
  /melambat|menurun|turun|drop|anjlok|melemah|lemah|defisit|flat|gagal|rendah|kurang|berkurang|habis|rusak/i;

function cleanQuery(value: string, sentence: ScriptSentence, topic: string) {
  const raw = normalizeCopy(stripEmoji(value))
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const keywords = keywordsFor(sentence);

  if (raw.length >= 4) {
    // A one-word LLM query is too generic; give it topical context.
    return raw.split(/\s+/).length <= 1 ? `${raw} ${topic}`.trim() : raw;
  }
  if (keywords.length >= 2) return keywords.slice(0, 3).join(" ");
  if (keywords.length === 1) return `${keywords[0]} ${topic}`.trim();
  return topic;
}

/** Strip a value to a 1-2 word axis label (never a sentence). */
function axisLabelSafe(value: string, fallback = "DATA") {
  const cleaned = axisLabel(
    stripEmoji(value)
      .replace(/[()[\]]/g, " ")
      .replace(/[^\p{L}\p{N}\s%]/gu, " "),
  );
  return cleaned || fallback;
}

type StageData = {
  visualType: VisualType;
  stageLabel: string;
  metric?: SceneMetric;
  counter?: SceneCounter;
  range?: SceneRange;
  bars?: SceneBar[];
  wave?: SceneWave;
  stamp?: SceneStamp;
  compare?: SceneCompare;
  layers?: SceneLayer[];
  steps?: SceneStep[];
  shot?: Partial<ExplainerShot>;
  imageSearchQuery: string;
  imageStyle: ImageFrameStyle;
};

/** Stage yang animasinya berjalan sepanjang kalimat (lanjut antar potongan). */
const EDITORIAL_STAGES = new Set<VisualType>([
  "ISO_ASSEMBLY",
  "MECHANISM_FLOW",
  "BLUEPRINT",
  "SVG_STAMP",
  "SVG_COMPARE",
  "SVG_CROSSSECTION",
  "SVG_TIMELINE",
]);

function deriveShotForScene(
  model: ObjectModel | undefined,
  candidate: Candidate | undefined,
  sentence: ScriptSentence,
  sceneIndex: number,
  mode: VisualType,
): Partial<ExplainerShot> {
  const rawShot = candidate?.shot;
  if (!model || model.parts.length === 0) {
    return rawShot ?? { cutaway: 0.65, explode: 0.15, zoom: 1.05, labels: "all", yaw: (sceneIndex * 18) % 360 };
  }

  const partIds = new Set(model.parts.map((p) => p.id));
  const lower = sentence.text.toLowerCase();
  const matched = model.parts
    .filter((p) =>
      p.label
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length >= 4 && lower.includes(w)),
    )
    .map((p) => p.id);

  const validCandidateFocus = (rawShot?.focus ?? []).filter((id) => partIds.has(id));
  const fallbackPart = model.parts[sceneIndex % model.parts.length].id;
  const focus =
    validCandidateFocus.length > 0
      ? validCandidateFocus
      : matched.length > 0
        ? matched.slice(0, 2)
        : mode === "BLUEPRINT"
          ? [fallbackPart]
          : [fallbackPart];

  const isHook = sentence.role === "hook" || sceneIndex === 0;
  const isCta = sentence.role === "cta";
  const stepCount = Math.max(1, model.steps.length);

  if (isHook) {
    return {
      focus: [],
      cutaway: 0.72,
      explode: 0.12,
      zoom: 1.06,
      labels: "all",
      yaw: -14,
    };
  }
  if (isCta) {
    return {
      focus: [],
      cutaway: 0.35,
      explode: 0,
      zoom: 1.0,
      labels: "all",
      yaw: 16,
    };
  }
  if (mode === "MECHANISM_FLOW") {
    return {
      focus,
      cutaway: rawShot?.cutaway ?? 0.68,
      explode: rawShot?.explode ?? 0.08,
      zoom: rawShot?.zoom ?? 1.08,
      flowId: rawShot?.flowId ?? model.flows[0]?.id,
      step: rawShot?.step ?? sceneIndex % stepCount,
      labels: "focus",
      yaw: rawShot?.yaw ?? ((sceneIndex * 22) % 60) - 25,
    };
  }
  if (mode === "BLUEPRINT") {
    return {
      focus,
      cutaway: rawShot?.cutaway ?? 0.55,
      explode: rawShot?.explode ?? 0.32,
      zoom: rawShot?.zoom ?? 1.15,
      labels: "all",
      yaw: rawShot?.yaw ?? ((sceneIndex * 16) % 50) - 20,
    };
  }
  return {
    focus,
    cutaway: rawShot?.cutaway ?? 0.75,
    explode: rawShot?.explode ?? (sceneIndex % 2 === 0 ? 0.15 : 0.35),
    zoom: rawShot?.zoom ?? (focus.length === 1 ? 1.24 : 1.08),
    labels: rawShot?.labels ?? "focus",
    yaw: rawShot?.yaw ?? ((sceneIndex * 20) % 60) - 25,
  };
}

/**
 * Visual type di luar kebijakan gaya video (mis. SVG_STAMP di video lifestyle)
 * diganti B_ROLL_IMAGE. Ini jaring pengaman: LLM bisa saja melanggar prompt,
 * dan deriveStage juga bisa memilih counter/wave dari pola teks.
 */
function restrictToStyle(stage: StageData, style: TopicStyle): StageData {
  if (isVisualAllowed(style, stage.visualType)) return stage;
  return {
    visualType: "B_ROLL_IMAGE",
    stageLabel: "",
    imageSearchQuery: stage.imageSearchQuery,
    imageStyle: stage.imageStyle,
  };
}

/**
 * Pick the center-stage mode from the narration, not from LLM prose.
 * Every number that reaches the screen is checked against the sentence.
 */
function deriveStage(
  candidate: Candidate | undefined,
  sentence: ScriptSentence,
  topic: string,
  sceneIndex: number,
  knowledge = "",
  model?: ObjectModel,
): StageData {
  const text = sentence.text;
  const digitText = digitizeSpokenNumbers(text);
  const digits = narrationDigits(digitText);
  const query = cleanQuery(candidate?.imageSearchQuery ?? "", sentence, topic);
  const imageStyle =
    candidate?.imageStyle ??
    IMAGE_STYLES[sceneIndex % IMAGE_STYLES.length];

  const image = (): StageData => ({
    visualType: "B_ROLL_IMAGE",
    stageLabel: "",
    imageSearchQuery: query,
    imageStyle,
  });

  const yearMatch = digitText.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    if (grounded(year, digits)) {
      const label = axisLabelSafe(candidate?.stageLabel ?? "TAHUN", "TAHUN");
      return {
        visualType: "SVG_COUNTER",
        stageLabel: label,
        counter: { from: 2026, to: year, suffix: "", label },
        metric: { value: year, suffix: "", label },
        imageSearchQuery: query,
        imageStyle,
      };
    }
  }

  const rawBars = (candidate?.bars ?? [])
    .filter((bar) => grounded(bar.value, digits))
    .slice(0, 3);
  const barUnits = [...new Set(rawBars.map((bar) => bar.unit).filter(Boolean))];
  const bars =
    barUnits.length <= 1
      ? rawBars.map((bar) => ({
          label: axisLabelSafe(bar.label, "DATA"),
          value: bar.value,
          unit: (barUnits[0] ?? "").replace(/[^a-zA-Z%]/g, "").toUpperCase(),
          highlight: Boolean(bar.highlight),
        }))
      : [];
  if (bars.length >= 2) {
    return {
      visualType: "SVG_BAR_CHART",
      stageLabel: axisLabelSafe(candidate?.stageLabel ?? "DATA", "DATA"),
      bars,
      imageSearchQuery: query,
      imageStyle,
    };
  }

  const explicitRange = candidate?.range;
  const explicitValid =
    Boolean(explicitRange?.from && explicitRange?.to) &&
    explicitRange!.from < explicitRange!.to &&
    grounded(explicitRange!.from, digits) &&
    grounded(explicitRange!.to, digits);
  const parsedRange = parseRange(text);

  const metricValue = Number(candidate?.metric?.value ?? 0);
  const strongMetric = grounded(metricValue, digits) && metricValue >= 100;

  const rangeSource = strongMetric
    ? null
    : explicitValid
      ? {
          from: explicitRange!.from,
          to: explicitRange!.to,
          min: explicitRange!.min,
          max: explicitRange!.max,
          unit: explicitRange!.unit,
        }
      : parsedRange;

  if (
    rangeSource &&
    grounded(rangeSource.from, digits) &&
    grounded(rangeSource.to, digits) &&
    rangeSource.from < rangeSource.to
  ) {
    const unit = (rangeSource.unit || "").replace(/[^a-zA-Z%]/g, "").toUpperCase();
    const max = Math.max(
      rangeSource.to + 1,
      Number(rangeSource.max) > rangeSource.to ? rangeSource.max : rangeSource.to + 2,
    );
    const labelCandidate =
      candidate?.stageLabel ??
      (explicitValid ? explicitRange?.label : unit) ??
      unit;
    const gaugeLabel =
      labelCandidate.trim().toUpperCase() === unit && unit.length > 0
        ? "RENTANG"
        : labelCandidate;
    return {
      visualType: "SVG_GAUGE",
      stageLabel: axisLabelSafe(gaugeLabel, unit || "RENTANG"),
      range: {
        from: rangeSource.from,
        to: rangeSource.to,
        min: Math.max(0, Number(rangeSource.min) || 0),
        max,
        unit,
        label: axisLabelSafe(gaugeLabel, ""),
      },
      imageSearchQuery: query,
      imageStyle,
    };
  }

  // Visual editorial: hanya kalau LLM memintanya DAN lolos guard (label 1-2 kata,
  // terlacak ke narasi/riset). Kalau tidak lolos, jatuh ke wave/counter/b-roll.
  const wanted = candidate?.visualType;
  if (
    wanted === "ISO_ASSEMBLY" ||
    wanted === "MECHANISM_FLOW" ||
    wanted === "BLUEPRINT"
  ) {
    return {
      visualType: wanted,
      stageLabel: axisLabelSafe(candidate?.stageLabel ?? "", wanted === "BLUEPRINT" ? "BLUEPRINT" : "MEKANISME"),
      shot: deriveShotForScene(model, candidate, sentence, sceneIndex, wanted),
      imageSearchQuery: query,
      imageStyle,
    };
  }
  if (wanted === "SVG_STAMP") {
    const stamp = deriveStamp(candidate?.stamp, text);
    if (stamp) {
      return {
        visualType: "SVG_STAMP",
        stageLabel: "",
        stamp,
        imageSearchQuery: query,
        imageStyle,
      };
    }
  }
  if (wanted === "SVG_COMPARE") {
    const compare = deriveCompare(candidate?.compare, knowledge, digits);
    if (compare) {
      return {
        visualType: "SVG_COMPARE",
        stageLabel: "",
        compare,
        imageSearchQuery: query,
        imageStyle,
      };
    }
  }
  if (wanted === "SVG_CROSSSECTION") {
    const derived = deriveLayers(candidate?.layers, knowledge, digits);
    const modelLayers =
      model && model.parts.length >= 3
        ? model.parts.slice(0, 4).map((p) => ({ label: p.label }))
        : null;
    const layers = derived && derived.length >= 3 ? derived : modelLayers;
    if (layers) {
      return {
        visualType: "SVG_CROSSSECTION",
        stageLabel: axisLabelSafe(candidate?.stageLabel ?? "", "POTONGAN"),
        layers,
        imageSearchQuery: query,
        imageStyle,
      };
    }
  }
  if (wanted === "SVG_TIMELINE") {
    const derived = deriveSteps(candidate?.steps, knowledge, digits);
    const modelSteps =
      model && model.steps.length >= 3
        ? model.steps.slice(0, 4).map((label) => ({ label }))
        : model && model.parts.length >= 3
          ? model.parts.slice(0, 4).map((p) => ({ label: p.label }))
          : null;
    const steps = derived && derived.length >= 3 ? derived : modelSteps;
    if (steps) {
      return {
        visualType: "SVG_TIMELINE",
        stageLabel: axisLabelSafe(candidate?.stageLabel ?? "", "URUTAN"),
        steps,
        imageSearchQuery: query,
        imageStyle,
      };
    }
  }
  const wantsWave =
    candidate?.visualType === "SVG_WAVEFORM" ||
    Boolean(candidate?.wave) ||
    DECLINE_PATTERN.test(text);
  if (wantsWave) {
    const dip = Math.min(0.85, Math.max(0.3, Number(candidate?.wave?.dip ?? 0.58)));
    return {
      visualType: "SVG_WAVEFORM",
      stageLabel: axisLabelSafe(candidate?.stageLabel ?? candidate?.wave?.label ?? "OTAK", "OTAK"),
      wave: { label: axisLabelSafe(candidate?.wave?.label ?? "OTAK", "OTAK"), dip },
      imageSearchQuery: query,
      imageStyle,
    };
  }

  if (grounded(metricValue, digits) && metricValue >= 3) {
    const label = axisLabelSafe(candidate?.stageLabel ?? candidate?.metric?.label ?? "", "DATA");
    const suffix = (candidate?.metric?.suffix ?? "").replace(/[^a-zA-Z% ]/g, "").trim();
    return {
      visualType: "SVG_COUNTER",
      stageLabel: label,
      counter: { from: 0, to: metricValue, suffix, label },
      metric: { value: metricValue, suffix, label },
      imageSearchQuery: query,
      imageStyle,
    };
  }

  const number = parseNumber(text);
  if (number && number.value >= 3 && grounded(number.value, digits)) {
    const label = axisLabelSafe(candidate?.stageLabel ?? "", "DATA");
    return {
      visualType: "SVG_COUNTER",
      stageLabel: label,
      counter: { from: 0, to: number.value, suffix: number.suffix, label },
      metric: { value: number.value, suffix: number.suffix, label },
      imageSearchQuery: query,
      imageStyle,
    };
  }

  return image();
}

function resolveTheme(raw: SceneTheme | undefined, sentence: ScriptSentence, accent: string): SceneTheme {
  const text = sentence.text.toLowerCase();
  if (/bahaya|racun|salah|mitos|dilarang|risiko|gagal|beracun|fatal|defisit|melambat/.test(text)) {
    return "danger";
  }
  if (/aman|solusi|benar|terbukti|menyelamatkan|segar|nyenyak/.test(text)) return "success";
  if (/waspada|hati-hati|awas|jangan|kurang/.test(text)) return "warn";
  if (raw) return raw;

  const rgb = hexToRgb(accent);
  if (rgb && rgb.r > rgb.g * 1.25 && rgb.r > rgb.b * 1.25) return "warn";
  return "info";
}

function deriveSkillStage(
  type: VisualType,
  candidate: Candidate | undefined,
  sentence: ScriptSentence,
  knowledge: string,
  sceneIndex = 0,
  model?: ObjectModel,
): Partial<StageData> | null {
  const digits = narrationDigits(digitizeSpokenNumbers(sentence.text));

  switch (type) {
    case "ISO_ASSEMBLY":
    case "MECHANISM_FLOW":
    case "BLUEPRINT":
      return {
        visualType: type,
        stageLabel: axisLabelSafe(
          candidate?.stageLabel ?? "",
          type === "BLUEPRINT" ? "BLUEPRINT" : "MEKANISME",
        ),
        shot: deriveShotForScene(model, candidate, sentence, sceneIndex, type),
      };
    case "SVG_COMPARE": {
      const compare = deriveCompare(candidate?.compare, knowledge, digits);
      return compare
        ? { visualType: "SVG_COMPARE", stageLabel: "", compare }
        : null;
    }
    case "SVG_CROSSSECTION": {
      const derived = deriveLayers(candidate?.layers, knowledge, digits);
      const fallbackLayers =
        model && model.parts.length >= 3
          ? model.parts.slice(0, 4).map((p) => ({ label: p.label }))
          : null;
      const layers = derived && derived.length >= 3 ? derived : fallbackLayers;
      return layers
        ? {
            visualType: "SVG_CROSSSECTION",
            stageLabel: axisLabelSafe(candidate?.stageLabel ?? "", "POTONGAN"),
            layers,
          }
        : null;
    }
    case "SVG_TIMELINE": {
      const derived = deriveSteps(candidate?.steps, knowledge, digits);
      const fallbackSteps =
        model && model.steps.length >= 3
          ? model.steps.slice(0, 4).map((label) => ({ label }))
          : model && model.parts.length >= 3
            ? model.parts.slice(0, 4).map((p) => ({ label: p.label }))
            : null;
      const steps = derived && derived.length >= 3 ? derived : fallbackSteps;
      return steps
        ? {
            visualType: "SVG_TIMELINE",
            stageLabel: axisLabelSafe(candidate?.stageLabel ?? "", "URUTAN"),
            steps,
          }
        : null;
    }
    case "SVG_STAMP": {
      const stamp = deriveStamp(candidate?.stamp, sentence.text);
      return stamp
        ? { visualType: "SVG_STAMP", stageLabel: "", stamp }
        : null;
    }
    default:
      return null;
  }
}

const EXPLAINER_CYCLE: VisualType[] = [
  "ISO_ASSEMBLY",
  "MECHANISM_FLOW",
  "BLUEPRINT",
  "ISO_ASSEMBLY",
  "SVG_CROSSSECTION",
  "MECHANISM_FLOW",
  "SVG_TIMELINE",
];

function normalizeScenes(
  output: VisualPlanOutput,
  sentences: ScriptSentence[],
  timings: Timing[],
  duration: number,
  topic: string,
  knowledge = "",
  style: TopicStyle = "factcheck",
  hints: ImageHints = NO_HINTS,
  grammar: VisualGrammar = visualGrammarFor([], style),
  model: ObjectModel = genericModel(topic, []),
): VisualScene[] {
  const scenes: VisualScene[] = [];
  let previousMotion: MotionType | null = null;
  let previousStage: VisualType | null = null;
  const seenStageKeys = new Set<string>();
  let previousImageStyle: ImageFrameStyle | null = null;
  let bRollCount = 0;
  let explainerCycleCursor = 0;
  const maxBRollScenes = Math.max(2, Math.floor(sentences.length * 0.25));

  sentences.forEach((sentence, sentenceIndex) => {
    const candidate = output.scenes[sentenceIndex];
    const isLastSentence = sentenceIndex === sentences.length - 1;

    const start = sentenceIndex === 0 ? 0 : timings[sentenceIndex].start;
    let end = isLastSentence
      ? duration
      : Math.max(
          timings[sentenceIndex].end,
          timings[sentenceIndex + 1].start,
        );

    if (!isLastSentence) {
      end = Math.max(
        start + 0.5,
        Math.min(end, timings[sentenceIndex + 1].start),
      );
    } else {
      end = Math.max(start + 0.5, duration);
    }

    const span = Math.max(0.5, end - start);
    const chunkCount = Math.max(1, Math.ceil(span / grammar.maxSceneSeconds));
    const chunkLength = span / chunkCount;
    const restricted = restrictToStyle(
      deriveStage(candidate, sentence, topic, scenes.length, knowledge, model),
      style,
    );
    const baseStage: StageData = {
      ...restricted,
      imageSearchQuery: anchorImageQuery(
        hints.searchTopic
          ? (candidate?.imageSearchQuery ?? "")
          : restricted.imageSearchQuery,
        topic,
        style,
        { ...hints, sceneIndex: scenes.length },
      ),
    };

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const chunkStart = start + chunkIndex * chunkLength;
      const chunkEnd =
        chunkIndex === chunkCount - 1 ? end : chunkStart + chunkLength;
      const sceneIndex = scenes.length;

      let motion =
        candidate?.motion.type ?? MOTIONS[sceneIndex % MOTIONS.length];
      if (motion === previousMotion) {
        motion = MOTIONS[(MOTIONS.indexOf(motion) + 1) % MOTIONS.length];
      }
      previousMotion = motion;

      const accent = candidate?.accentColor ?? "";
      const accentColor = pickAccent(accent, sceneIndex);
      const theme = resolveTheme(candidate?.theme, sentence, accentColor);
      const gradient = pickBackground(candidate?.background.value ?? "", sceneIndex);
      const fallback =
        candidate?.background.fallback &&
        candidate.background.fallback.startsWith("linear-gradient")
          ? candidate.background.fallback
          : gradient;

      let stage: StageData = { ...baseStage };
      const sceneRole: SceneRole =
        sentence.role === "hook" || sentenceIndex === 0
          ? "hook"
          : sentence.role === "cta" || isLastSentence
            ? "cta"
            : "body";

      const pickNextExplainer = (): StageData => {
        for (let tries = 0; tries < EXPLAINER_CYCLE.length; tries += 1) {
          const nextType =
            EXPLAINER_CYCLE[(explainerCycleCursor + tries) % EXPLAINER_CYCLE.length];
          if (!isVisualAllowed(style, nextType)) continue;
          const derived = deriveSkillStage(
            nextType,
            candidate,
            sentence,
            knowledge,
            sceneIndex + tries,
            model,
          );
          if (derived && derived.visualType) {
            const key = JSON.stringify([
              derived.visualType,
              derived.shot?.focus,
              derived.layers,
              derived.steps,
            ]);
            if (!seenStageKeys.has(key) || tries === EXPLAINER_CYCLE.length - 1) {
              explainerCycleCursor += tries + 1;
              return { ...stage, ...derived, visualType: derived.visualType };
            }
          }
        }
        explainerCycleCursor += 1;
        return {
          ...stage,
          visualType: "ISO_ASSEMBLY",
          stageLabel: "MEKANISME",
          shot: deriveShotForScene(model, candidate, sentence, sceneIndex, "ISO_ASSEMBLY"),
        };
      };

      // Hook wajib penjelas visual yang kuat (cutaway 3D atau metrik skala), bukan foto kusam.
      if (
        sceneRole === "hook" &&
        (stage.visualType === "B_ROLL_IMAGE" ||
          stage.visualType === "SVG_STAMP" ||
          stage.visualType === "SVG_WAVEFORM")
      ) {
        stage = {
          ...stage,
          visualType: "ISO_ASSEMBLY",
          stageLabel: "MEKANISME",
          shot: deriveShotForScene(model, candidate, sentence, sceneIndex, "ISO_ASSEMBLY"),
        };
      }
      if (sceneRole === "hook" && motion === "shake") motion = "zoomIn";

      // CTA: foto tenang tanpa grafik agar kalimat penutup bernapas.
      if (sceneRole === "cta" && stage.visualType !== "B_ROLL_IMAGE") {
        stage = {
          ...stage,
          visualType: "B_ROLL_IMAGE",
          stageLabel: "",
          shot: undefined,
          metric: undefined,
          counter: undefined,
          range: undefined,
          bars: undefined,
          wave: undefined,
          stamp: undefined,
          compare: undefined,
          layers: undefined,
          steps: undefined,
        };
      }

      // Potongan ke-2 dari kalimat yang sama: kalau B_ROLL_IMAGE atau statis kembar, putar ke sudut explainer baru.
      if (chunkIndex > 0 && sceneRole !== "cta" && stage.visualType === "B_ROLL_IMAGE") {
        stage = pickNextExplainer();
      }

      // Cegah grafis statis identik (compare/crosssection/timeline yang persis sama berulang).
      const isData = (type: VisualType) => type !== "B_ROLL_IMAGE";
      const stageKey = JSON.stringify([
        stage.visualType,
        stage.shot?.focus,
        stage.shot?.step,
        stage.layers,
        stage.steps,
        stage.counter,
        stage.metric,
        stage.stamp,
        stage.compare,
        stage.bars,
        stage.range,
      ]);
      if (isData(stage.visualType) && chunkIndex === 0 && seenStageKeys.has(stageKey)) {
        stage = pickNextExplainer();
      }

      // Batasi B_ROLL_IMAGE maksimal 25% scene & larang 2 B_ROLL_IMAGE berturut-turut pada body/hook!
      if (stage.visualType === "B_ROLL_IMAGE" && sceneRole !== "cta") {
        const ConsecutivePhoto = previousStage === "B_ROLL_IMAGE";
        const OverQuota = bRollCount >= maxBRollScenes;
        const NeedsMoreExplainer =
          sceneRole === "body" &&
          scenes.filter((s) => s.visualType !== "B_ROLL_IMAGE").length <
            grammar.minExplainerScenes &&
          sceneIndex % 3 !== 1;
        if (ConsecutivePhoto || OverQuota || NeedsMoreExplainer) {
          stage = pickNextExplainer();
        }
      }

      if (stage.visualType === "B_ROLL_IMAGE") {
        bRollCount += 1;
      } else {
        seenStageKeys.add(stageKey);
      }
      previousStage = stage.visualType;

      if (stage.imageStyle === previousImageStyle) {
        stage = {
          ...stage,
          imageStyle:
            IMAGE_STYLES[(IMAGE_STYLES.indexOf(stage.imageStyle) + 1) % IMAGE_STYLES.length],
        };
      }
      previousImageStyle = stage.imageStyle;

      scenes.push({
        id: `sc${sceneIndex + 1}`,
        role: sceneRole,
        startTime: Math.round(Math.max(0, chunkStart) * 1000) / 1000,
        endTime: Math.round(Math.min(duration, chunkEnd) * 1000) / 1000,
        duration: Math.round(Math.max(0.4, chunkEnd - chunkStart) * 1000) / 1000,
        background: {
          type: "gradient",
          value: gradient,
          fallback,
        },
        motion: {
          type: motion,
          intensity: Math.min(0.5, Math.max(0.1, candidate?.motion.intensity ?? 0.2)),
        },
        kenBurns: true,
        textAnimation: {
          type:
            candidate?.textAnimation.type ??
            ANIMATIONS[sceneIndex % ANIMATIONS.length],
        },
        visualType: stage.visualType,
        imageSearchQuery:
          chunkIndex > 0 && hints.searchTopic
            ? anchorImageQuery("", topic, style, { ...hints, sceneIndex })
            : stage.imageSearchQuery,
        imageStyle: stage.imageStyle,
        imageGrade: grammar.grade,
        gridOverlay: grammar.grid,
        stageLabel: stage.stageLabel,
        metric: stage.metric,
        counter: stage.counter,
        range: stage.range,
        bars: stage.bars,
        wave: stage.wave,
        stamp: stage.stamp,
        compare: stage.compare,
        layers: stage.layers,
        steps: stage.steps,
        shot: stage.shot,
        visualOffset: EDITORIAL_STAGES.has(stage.visualType)
          ? Math.round(Math.max(0, chunkStart - start) * 1000) / 1000
          : undefined,
        theme,
        accentColor,
      });
    }
  });

  return scenes;
}

export function fallbackPlan(
  sentences: ScriptSentence[],
  timings: Timing[],
  duration: number,
  topic: string,
  style: TopicStyle = "factcheck",
  hints: ImageHints = NO_HINTS,
  knowledge = "",
  grammar: VisualGrammar = visualGrammarFor([], style),
  model: ObjectModel = genericModel(topic, []),
): VisualPlan {
  return {
    vibe: "fast-cut, high contrast, gen-z viral",
    generatedAt: new Date().toISOString(),
    model,
    grammar: {
      id: grammar.id,
      label: grammar.label,
      principle: grammar.principle,
      maxSceneSeconds: grammar.maxSceneSeconds,
      minExplainerScenes: grammar.minExplainerScenes,
    },
    scenes: normalizeScenes(
      {
        vibe: "fallback",
        scenes: sentences.map((sentence, index) => ({
          id: `sc${index + 1}`,
          startTime: timings[index].start,
          endTime: timings[index].end,
          background: {
            type: "gradient" as const,
            value: GRADIENT_PALETTES[index % GRADIENT_PALETTES.length],
          },
          motion: {
            type: MOTIONS[index % MOTIONS.length],
            intensity: 0.18 + (index % 3) * 0.05,
          },
          kenBurns: true,
          textAnimation: {
            type: ANIMATIONS[index % ANIMATIONS.length],
          },
          imageSearchQuery: cleanQuery("", sentence, topic),
          accentColor: ACCENTS[index % ACCENTS.length],
        })),
      } as VisualPlanOutput,
      sentences,
      timings,
      duration,
      topic,
      knowledge,
      style,
      hints,
      grammar,
      model,
    ),
  };
}

export async function runVisualPlanner(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  const fullScript = project.fullScript as unknown as FullScript | null;
  const words = project.wordTimestamps as unknown as WordTimestamp[] | null;
  if (!fullScript || !Array.isArray(fullScript.sentences)) {
    throw new Error("Naskah belum tersedia untuk visual planner.");
  }
  if (!project.audioUrl || !project.duration) {
    throw new Error("Audio belum tersedia untuk visual planner.");
  }

  await startStage(projectId, "visual-planning");

  const duration = project.duration;
  const timings = sentenceTimings(fullScript.sentences, words ?? [], duration);

  const sentenceTable = fullScript.sentences
    .map(
      (sentence, index) =>
        `${index + 1}. [${timings[index].start.toFixed(2)}s - ${timings[index].end.toFixed(2)}s]${sentence.role ? ` [${sentence.role}]` : ""} ${sentence.text}`,
    )
    .join("\n");

  const paletteTable = GRADIENT_PALETTES.map(
    (gradient, index) => `${index + 1}. ${gradient}`,
  ).join("\n");

  const researchData = (project.researchData ?? null) as ResearchData | null;
  const style = resolveTopicStyle(researchData?.style);
  const hints = readImageHints(researchData);
  const extraSkills = researchData?.skills?.extra ?? [];
  const grammar = visualGrammarFor(extraSkills, style);
  const playbook = await buildPlaybook("visual", style, extraSkills);

  // Bangun/ambil ObjectModel 3D isometrik bersama untuk topik ini.
  const model = await ensureObjectModel({
    topic: project.topic,
    style,
    researchData,
    sentences: fullScript.sentences,
    modelOverride: project.model,
  });

  // Basis pelacakan label editorial: narasi + fakta riset + label ObjectModel (huruf kecil).
  const modelVocab = `${model.parts.map((p) => p.label).join(" ")} ${model.steps.join(" ")}`;
  const knowledge = `${project.topic} ${fullScript.sentences
    .map((sentence) => sentence.text)
    .join(" ")} ${JSON.stringify(researchData ?? {})} ${modelVocab}`.toLowerCase();

  const modelBrief = `OBJECT MODEL (gunakan id part & flowId ini pada field "shot" untuk ISO_ASSEMBLY / MECHANISM_FLOW / BLUEPRINT):
- parts: ${model.parts.map((p) => `${p.id} ("${p.label}", ${p.shape})`).join(", ")}
- flows: ${model.flows.map((f) => `${f.id} ("${f.label}": ${f.through.join(" -> ")})`).join(", ") || "-"}
- steps: ${model.steps.map((s, i) => `${i}: "${s}"`).join(", ") || "-"}`;

  let plan: VisualPlan;
  try {
    const output = await chatJSON({
      system: `${visualSystemPromptFor(style)}${playbook.text ? `\n\n${playbook.text}` : ""}\n\n${grammarBrief(grammar, extraSkills)}`,
      user: `TOPIK: ${project.topic}
DURASI AUDIO: ${duration.toFixed(2)} detik
JUMLAH KALIMAT: ${fullScript.sentences.length}

${modelBrief}

KALIMAT + TIMING (wajib jadi acuan scene):
${sentenceTable}

PILIHAN GRADIENT (background.value harus salah satu string ini):
${paletteTable}

${
  hints.visualTerms.length
    ? `VISUAL TERMS (BAHASA INGGRIS). imageSearchQuery tiap scene WAJIB salah satu frasa berikut (salin persis, boleh ditambah satu kata sudut seperti "close up" atau "aerial"). Pilih frasa yang paling cocok dengan kalimat scene dan variasikan antar scene; dilarang memakai kata Indonesia di imageSearchQuery. Pilih adegan yang bisa difoto, bukan peta/grafik:\n${hints.visualTerms.map((term) => `- ${term}`).join("\n")}\n\n`
    : ""
}FAKTA RISET:
${JSON.stringify({ ...((researchData as object) ?? {}), visualTerms: undefined, avoidTerms: undefined, anatomy: undefined }).slice(0, 1800)}

Buat tepat ${fullScript.sentences.length} scene, satu scene per kalimat. Jangan mengubah timing.
Scene bertanda [hook] adalah 3 detik pertama: pakai ISO_ASSEMBLY cutaway overview (atau angka skala).
Scene bertanda [cta] adalah penutup: pakai ISO_ASSEMBLY rakitan utuh tenang (atau 1 foto relevan).
SKILL VISUAL: WAJIB minimal ${grammar.minExplainerScenes} scene memakai visual penjelas (${grammar.preferred
        .filter((type) => type !== "B_ROLL_IMAGE")
        .join(" / ")}). B_ROLL_IMAGE maksimal 25% scene dan dilarang 2 foto berturut-turut.
Untuk ISO_ASSEMBLY / MECHANISM_FLOW / BLUEPRINT isi "shot": { "focus": ["<part-id>"], "cutaway": 0.7, "explode": 0.2, "zoom": 1.2, "flowId": "${model.flows[0]?.id ?? "main-flow"}", "step": 0, "labels": "focus" }.
INGAT: jangan kirim headline/subheadline/tags/emoji/kalimat transkrip. Center stage hanya angka/metrik atau label sumbu 1-2 kata.`,
      schema: visualPlanSchema,
      tier: "primary",
      modelOverride: project.model,
      temperature: 0.7,
      maxTokens: 3400,
    });

    plan = {
      vibe: output.vibe,
      generatedAt: new Date().toISOString(),
      model,
      skillsUsed: extraSkills,
      grammar: {
        id: grammar.id,
        label: grammar.label,
        principle: grammar.principle,
        maxSceneSeconds: grammar.maxSceneSeconds,
        minExplainerScenes: grammar.minExplainerScenes,
      },
      scenes: normalizeScenes(
        output,
        fullScript.sentences,
        timings,
        duration,
        project.topic,
        knowledge,
        style,
        hints,
        grammar,
        model,
      ),
    };
  } catch (error) {
    console.warn(
      "[visual-planner] LLM gagal, memakai visual plan fallback:",
      error instanceof Error ? error.message : error,
    );
    plan = fallbackPlan(
      fullScript.sentences,
      timings,
      duration,
      project.topic,
      style,
      hints,
      knowledge,
      grammar,
      model,
    );
    plan.skillsUsed = extraSkills;
  }

  const updatedResearch: ResearchData = {
    ...(researchData ?? {
      facts: [],
      sources: [],
      uniqueAngles: [],
      viralPotential: "",
    }),
    anatomy: model,
  };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      visualPlan: asJson(plan),
      researchData: asJson(updatedResearch),
    },
  });

  await completeStage(projectId, "visual-planning", {
    scenes: plan.scenes.length,
    style,
    vibe: plan.vibe,
    skills: plan.skillsUsed ?? [],
    grammar: plan.grammar?.label ?? "",
    explainerScenes: plan.scenes.filter((scene) => scene.visualType !== "B_ROLL_IMAGE").length,
    withImages: plan.scenes.filter((scene) => scene.visualType === "B_ROLL_IMAGE").length,
  });

  return plan;
}
