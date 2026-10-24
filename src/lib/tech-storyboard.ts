import { z } from "zod";
import { ASSEMBLIES, findPart } from "../remotion/tech3d/assemblies";
import type {
  AssemblyDef,
  CalloutSpec,
  Highlight,
  Keyframe,
  TechSceneSpec,
} from "../remotion/tech3d/types";
import { WordTimestamp, WordTimestampSchema } from "./types";

/* -------------------------------------------------------------------------- */
/*  Tipe runtime                                                              */
/* -------------------------------------------------------------------------- */

export interface TechBeatState {
  /** 0 = wireframe, 1 = blueprint */
  reveal: 0 | 1;
  /** 0 = utuh, 1 = exploded */
  explode: 0 | 1;
  /** 0 = tertutup, 1 = terpotong */
  section: 0 | 1;
}

export interface TechBeat {
  beatId: number;
  narration: string;
  hudLabel: string;
  state: TechBeatState;
  focusPartId?: string;
  callouts: Array<{ partId: string; text: string }>;
  // field runtime (diisi worker setelah TTS)
  audioUrl?: string;
  durationMs?: number;
  durationInFrames?: number;
  wordTimestamps?: WordTimestamp[];
}

export interface TechStoryboard {
  videoTitle: string;
  themeColor: string;
  /** id di katalog, atau "NONE" bila topik tidak cocok dengan assembly mana pun */
  assemblyId: string;
  fitReason?: string;
  /** definisi assembly lengkap (diisi worker) supaya job mandiri, termasuk assembly hasil rancangan LLM */
  assembly?: AssemblyDef;
  beats: TechBeat[];
}

export type TechVideoProps = {
  videoTitle: string;
  themeColor: string;
  assemblyId: string;
  /** bila ada, dipakai menggantikan lookup katalog bawaan */
  assembly?: AssemblyDef;
  totalDurationInFrames: number;
  fps: number;
  width: number;
  height: number;
  beats: TechBeat[];
};

/* -------------------------------------------------------------------------- */
/*  Skema validasi output LLM (toleran terhadap salah ketik, ketat pada id)    */
/* -------------------------------------------------------------------------- */

const norm = (v: unknown) => String(v ?? "").trim().toUpperCase();

const LookEnum = z.preprocess((v) => {
  const s = norm(v);
  if (!s) return undefined;
  return s.includes("WIRE") ? "WIREFRAME" : "BLUEPRINT";
}, z.enum(["WIREFRAME", "BLUEPRINT"]).optional());

const ExplodeEnum = z.preprocess((v) => {
  const s = norm(v);
  if (!s) return undefined;
  return s.includes("EXPLOD") || s.includes("BONGKAR") ? "EXPLODED" : "ASSEMBLED";
}, z.enum(["ASSEMBLED", "EXPLODED"]).optional());

const SectionEnum = z.preprocess((v) => {
  const s = norm(v);
  if (!s) return undefined;
  return s.includes("CUT") ||
    s.includes("SECTION") ||
    s.includes("OPEN") ||
    s.includes("BELAH")
    ? "CUT"
    : "CLOSED";
}, z.enum(["CLOSED", "CUT"]).optional());

const RawBeatSchema = z.object({
  narration: z.string().min(8),
  hudLabel: z.string().default(""),
  state: z
    .object({ look: LookEnum, explode: ExplodeEnum, section: SectionEnum })
    .default({}),
  focusPartId: z.string().nullish(),
  callouts: z
    .array(z.object({ partId: z.string(), text: z.string().default("") }))
    .default([]),
  // field runtime yang boleh ikut tersimpan
  audioUrl: z.string().optional(),
  durationMs: z.number().optional(),
  durationInFrames: z.number().optional(),
  wordTimestamps: z.array(WordTimestampSchema).optional(),
});

const RawStoryboardSchema = z.object({
  videoTitle: z.string().default("Video Teknik"),
  themeColor: z.string().default("#38BDF8"),
  assemblyId: z.string(),
  fitReason: z.string().optional(),
  beats: z.array(RawBeatSchema).default([]),
});

export const MIN_BEATS = 5;
export const MAX_BEATS = 12;

export interface TechSchemaOptions {
  /** wajib memakai assembly ini (dan NONE dilarang) */
  forceAssemblyId?: string;
}

export function makeTechStoryboardSchema(
  catalog: Record<string, AssemblyDef>,
  opts: TechSchemaOptions = {}
) {
  const ids = Object.keys(catalog);
  return RawStoryboardSchema.transform((raw, ctx): TechStoryboard => {
    const idLc = raw.assemblyId.trim().toLowerCase();

    if (idLc === "none") {
      if (opts.forceAssemblyId) {
        ctx.addIssue({
          code: "custom",
          path: ["assemblyId"],
          message: `assemblyId tidak boleh "NONE"; wajib "${opts.forceAssemblyId}".`,
        });
        return z.NEVER;
      }
      return {
        videoTitle: raw.videoTitle,
        themeColor: raw.themeColor,
        assemblyId: "NONE",
        fitReason: raw.fitReason ?? "",
        beats: [],
      };
    }

    const assembly = catalog[idLc];
    if (!assembly || (opts.forceAssemblyId && idLc !== opts.forceAssemblyId)) {
      ctx.addIssue({
        code: "custom",
        path: ["assemblyId"],
        message: opts.forceAssemblyId
          ? `assemblyId wajib "${opts.forceAssemblyId}".`
          : `assemblyId "${raw.assemblyId}" tidak ada di katalog. Pilih salah satu: ${ids.join(", ")} atau "NONE".`,
      });
      return z.NEVER;
    }

    if (raw.beats.length < MIN_BEATS || raw.beats.length > MAX_BEATS) {
      ctx.addIssue({
        code: "custom",
        path: ["beats"],
        message: `Jumlah beat harus ${MIN_BEATS}-${MAX_BEATS}, bukan ${raw.beats.length}.`,
      });
      return z.NEVER;
    }

    // State bersifat persisten: field yang dikosongkan mewarisi beat sebelumnya.
    const cur: TechBeatState = { reveal: 1, explode: 0, section: 0 };

    const beats: TechBeat[] = raw.beats.map((b, i) => {
      if (b.state.look) cur.reveal = b.state.look === "WIREFRAME" ? 0 : 1;
      if (b.state.explode) cur.explode = b.state.explode === "EXPLODED" ? 1 : 0;
      if (b.state.section) cur.section = b.state.section === "CUT" ? 1 : 0;

      const focus = b.focusPartId ? findPart(assembly, b.focusPartId) : undefined;

      const seen = new Set<string>();
      const callouts: TechBeat["callouts"] = [];
      for (const c of b.callouts) {
        const part = findPart(assembly, c.partId);
        if (!part || seen.has(part.id)) continue; // id ngawur: dibuang, bukan error
        seen.add(part.id);
        callouts.push({
          partId: part.id,
          text: (c.text.trim() || part.nameId).toUpperCase().slice(0, 24),
        });
        if (callouts.length === 2) break;
      }

      return {
        beatId: i + 1,
        narration: b.narration.trim(),
        hudLabel: b.hudLabel.trim().toUpperCase().slice(0, 28),
        state: { ...cur },
        focusPartId: focus?.id,
        callouts,
        audioUrl: b.audioUrl,
        durationMs: b.durationMs,
        durationInFrames: b.durationInFrames,
        wordTimestamps: b.wordTimestamps,
      };
    });

    return {
      videoTitle: raw.videoTitle,
      themeColor: raw.themeColor,
      assemblyId: assembly.id,
      fitReason: raw.fitReason,
      beats,
    };
  });
}

/** Skema dengan katalog bawaan kode (dipakai tes & kompatibilitas). */
export const TechStoryboardSchema = makeTechStoryboardSchema(ASSEMBLIES);

/* -------------------------------------------------------------------------- */
/*  Compiler: beat -> keyframe track untuk TechScene                           */
/* -------------------------------------------------------------------------- */

export const DEFAULT_BEAT_FRAMES = 150;

/** Lama transisi (frame) tiap jenis perubahan; dibatasi 60% durasi beat. */
const TRANSITION = { reveal: 36, explode: 42, section: 34 } as const;

export function beatStarts(beats: TechBeat[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const b of beats) {
    starts.push(acc);
    acc += b.durationInFrames ?? DEFAULT_BEAT_FRAMES;
  }
  return starts;
}

export function totalFrames(beats: TechBeat[]): number {
  return beats.reduce(
    (s, b) => s + (b.durationInFrames ?? DEFAULT_BEAT_FRAMES),
    0
  );
}

function push(track: Keyframe[], frame: number, value: number) {
  const last = track[track.length - 1];
  if (last && last.frame >= frame) {
    if (last.frame === frame) last.value = value;
    return;
  }
  track.push({ frame, value });
}

export function compileBeatsToSpec(props: TechVideoProps): TechSceneSpec {
  const assembly = props.assembly ?? ASSEMBLIES[props.assemblyId];
  if (!assembly) {
    throw new Error(
      `compileBeatsToSpec: assembly "${props.assemblyId}" tidak ada di katalog`
    );
  }

  const starts = beatStarts(props.beats);
  const total = totalFrames(props.beats);

  // Kondisi awal sebelum beat 1: wireframe, utuh, tertutup.
  const reveal: Keyframe[] = [{ frame: 0, value: 0 }];
  const explode: Keyframe[] = [{ frame: 0, value: 0 }];
  const section: Keyframe[] = [{ frame: 0, value: 0 }];
  const highlights: Highlight[] = [];
  const phases: TechSceneSpec["phases"] = [];
  const callouts: CalloutSpec[] = [];
  let calloutIdx = 0;

  props.beats.forEach((b, i) => {
    const s = starts[i];
    const d = b.durationInFrames ?? DEFAULT_BEAT_FRAMES;
    const cap = Math.max(6, Math.floor(d * 0.6));

    const drive = (
      tr: Keyframe[],
      key: keyof typeof TRANSITION,
      target: number
    ) => {
      const prev = tr[tr.length - 1].value;
      push(tr, s, prev); // tahan nilai lama sampai beat ini mulai
      push(tr, s + Math.min(TRANSITION[key], cap), target);
    };
    drive(reveal, "reveal", b.state.reveal);
    drive(explode, "explode", b.state.explode);
    drive(section, "section", b.state.section);

    if (b.focusPartId) {
      highlights.push({ partId: b.focusPartId, from: s + 6, to: s + d - 4 });
    }

    const nn = String(i + 1).padStart(2, "0");
    phases.push({
      from: s,
      to: s + d,
      label: `${nn} // ${b.hudLabel || "ANALISIS"}`,
    });

    const calloutFrom = s + Math.min(46, Math.floor(d * 0.35));
    for (const c of b.callouts) {
      callouts.push({
        partId: c.partId,
        text: c.text,
        from: calloutFrom,
        to: Math.max(calloutFrom + 20, s + d - 6),
        side: calloutIdx++ % 2 === 0 ? "R" : "L",
      });
    }
  });

  return {
    title: props.videoTitle.toUpperCase().slice(0, 26),
    themeColor: props.themeColor,
    durationInFrames: Math.max(1, total),
    parts: assembly.parts,
    reveal,
    explode,
    section,
    highlights,
    phases,
    callouts,
  };
}

/* -------------------------------------------------------------------------- */
/*  Contoh untuk Remotion Studio & pengecekan                                  */
/* -------------------------------------------------------------------------- */

export function makeSampleProps(
  assemblyId: string,
  title: string,
  beats: Array<Omit<TechBeat, "beatId" | "durationInFrames">>
): TechVideoProps {
  const full: TechBeat[] = beats.map((b, i) => ({
    ...b,
    beatId: i + 1,
    durationInFrames: DEFAULT_BEAT_FRAMES,
  }));
  return {
    videoTitle: title,
    themeColor: "#38BDF8",
    assemblyId,
    totalDurationInFrames: totalFrames(full),
    fps: 30,
    width: 1080,
    height: 1920,
    beats: full,
  };
}

const S = (
  reveal: 0 | 1,
  explode: 0 | 1,
  section: 0 | 1
): TechBeatState => ({ reveal, explode, section });

export const SAMPLE_PISTON_PROPS: TechVideoProps = makeSampleProps(
  "piston_engine",
  "Mesin Motor",
  [
    {
      narration:
        "Mesin motor kamu meledakkan bensin ratusan kali tiap menit, dan nggak hancur.",
      hudLabel: "MESIN 4-TAK",
      state: S(1, 0, 0),
      callouts: [],
    },
    {
      narration: "Semua ledakan itu terjadi di satu tempat kecil. Namanya silinder.",
      hudLabel: "SILINDER",
      state: S(1, 0, 0),
      focusPartId: "block",
      callouts: [{ partId: "block", text: "BLOK SILINDER" }],
    },
    {
      narration:
        "Kita belah supaya kelihatan isinya. Di dalam, piston naik turun tanpa henti.",
      hudLabel: "POTONGAN MELINTANG",
      state: S(1, 0, 1),
      focusPartId: "piston",
      callouts: [{ partId: "piston", text: "PISTON" }],
    },
    {
      narration:
        "Piston ini disambung batang ke poros engkol, jadi gerak lurus berubah jadi putaran.",
      hudLabel: "GERAK LURUS KE PUTARAN",
      state: S(1, 0, 1),
      focusPartId: "rod",
      callouts: [
        { partId: "rod", text: "BATANG PENGHUBUNG" },
        { partId: "crank", text: "POROS ENGKOL" },
      ],
    },
    {
      narration:
        "Di atas, busi memercikkan api. Campuran terbakar, dan piston terdorong ke bawah.",
      hudLabel: "LANGKAH TENAGA",
      state: S(1, 0, 0),
      focusPartId: "sparkplug",
      callouts: [{ partId: "sparkplug", text: "BUSI" }],
    },
    {
      narration:
        "Kalau dibongkar, ternyata cuma beberapa komponen sederhana yang bekerja kompak.",
      hudLabel: "TAMPILAN BONGKAR",
      state: S(1, 1, 0),
      callouts: [{ partId: "head", text: "KEPALA SILINDER" }],
    },
    {
      narration:
        "Roda gila menjaga putaran tetap halus, di antara ledakan yang datang satu-satu.",
      hudLabel: "RODA GILA",
      state: S(1, 1, 0),
      focusPartId: "flywheel",
      callouts: [{ partId: "flywheel", text: "RODA GILA" }],
    },
  ]
);
