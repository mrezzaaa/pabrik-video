import { z } from "zod";
import { createOmnirouteClient, extractJsonObject, getCandidateBaseUrls } from "./omniroute";

/**
 * Penilai gambar berbasis model vision untuk b-roll. Dipakai setelah kandidat diurutkan skor teks:
 * model melihat thumbnail dan memilih yang relevan dan bebas teks besar/poster/slide, atau menolak semuanya.
 * Mati kecuali IMAGE_JUDGE_MODEL di-set. Gagal = kembali ke perilaku tanpa penilai.
 */
export function imageJudgeModel(): string {
  return process.env.IMAGE_JUDGE_MODEL?.trim() ?? "";
}

export interface JudgeRequest {
  topic: string;
  narration: string;
  query: string;
  avoid: string[];
  /** Data URL (jpeg) per kandidat, urut = indeks pilihan. */
  thumbs: string[];
}

export type JudgeResult = { choice: number | null; reason: string } | { error: string };

export type JudgeCall = (req: JudgeRequest, model: string) => Promise<string>;

const judgeSchema = z.object({
  choice: z.union([z.number().int(), z.null()]),
  reason: z.string().optional().default(""),
});

export const JUDGE_SYSTEM_PROMPT = `Kamu editor video vertikal. Dari beberapa gambar kandidat, pilih SATU yang paling cocok sebagai latar b-roll untuk adegan yang disebutkan.
TOLAK gambar yang: didominasi teks besar (slide, poster, infografis, dokumen, kartu berita, screenshot), punya watermark/logo mencolok, kolase atau iklan produk, politik/partai/baliho, meme, orang yang tidak berkaitan dengan topik, atau tidak berhubungan dengan topik dan narasi.
Utamakan foto atau ilustrasi bersih yang objek utamanya jelas dan relevan. Kalau tidak ada satu pun yang layak, jawab choice null.
Jawab HANYA JSON: {"choice": <indeks gambar mulai 0, atau null>, "reason": "satu kalimat"}`;

export function parseJudgeAnswer(raw: string, candidates: number): JudgeResult {
  try {
    const parsed = judgeSchema.parse(extractJsonObject(raw));
    if (parsed.choice === null) return { choice: null, reason: parsed.reason };
    // Indeks ngawur = jawaban rusak (bukan penolakan): dihitung sebagai kegagalan penilai.
    if (parsed.choice < 0 || parsed.choice >= candidates) return { error: `indeks pilihan di luar rentang (${parsed.choice})` };
    return { choice: parsed.choice, reason: parsed.reason };
  } catch (error) {
    return { error: `jawaban penilai tidak valid: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function defaultCall(req: JudgeRequest, model: string): Promise<string> {
  const intro =
    `TOPIK VIDEO: ${req.topic}\nNARASI ADEGAN: ${req.narration || "(tidak tersedia)"}\nKATA KUNCI PENCARIAN: ${req.query}` +
    (req.avoid.length ? `\nHINDARI gambar tentang: ${req.avoid.join(", ")}` : "") +
    `\n\nBerikut ${req.thumbs.length} gambar kandidat.`;
  const content: Array<Record<string, unknown>> = [{ type: "text", text: intro }];
  req.thumbs.forEach((url, i) => {
    content.push({ type: "text", text: `Gambar ${i}:` });
    content.push({ type: "image_url", image_url: { url } });
  });
  let lastError: unknown;
  for (const baseUrl of getCandidateBaseUrls()) {
    try {
      const completion = await createOmnirouteClient(baseUrl).chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          { role: "system", content: JUDGE_SYSTEM_PROMPT },
          { role: "user", content: content as never },
        ],
      });
      const text = completion.choices[0]?.message?.content;
      if (!text || typeof text !== "string") throw new Error("jawaban kosong");
      return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

let consecutiveFailures = 0;
let disabledUntil = 0;

export function judgeAvailable(model: string, now = Date.now()): boolean {
  return Boolean(model) && now >= disabledUntil;
}

export function resetJudgeState(): void {
  consecutiveFailures = 0;
  disabledUntil = 0;
}

/** Dua kegagalan beruntun (model tanpa vision, jaringan) mematikan penilai 10 menit. */
export async function judgeImages(
  req: JudgeRequest,
  model: string,
  call: JudgeCall = defaultCall,
  now = Date.now,
): Promise<JudgeResult> {
  if (!judgeAvailable(model, now())) return { error: "penilai dinonaktifkan sementara" };
  let result: JudgeResult;
  try {
    result = parseJudgeAnswer(await call(req, model), req.thumbs.length);
  } catch (error) {
    result = { error: error instanceof Error ? error.message : String(error) };
  }
  if ("error" in result) {
    consecutiveFailures += 1;
    if (consecutiveFailures >= 2) {
      disabledUntil = now() + 10 * 60_000;
      console.warn(`[image-judge] gagal berturut-turut, dinonaktifkan 10 menit: ${result.error}`);
    }
  } else {
    consecutiveFailures = 0;
  }
  return result;
}
