import OpenAI from "openai";
import { ZodError } from "zod";
import {
  MASTER_SYSTEM_PROMPT,
  QUERY_GENERATOR_PROMPT,
  buildAssemblyDesignerPrompt,
  buildTechDirectorPrompt,
} from "./prompts";
import { Storyboard, StoryboardSchema } from "./types";
import { TechStoryboard, makeTechStoryboardSchema } from "./tech-storyboard";
import { ASSEMBLIES } from "../remotion/tech3d/assemblies";
import type { AssemblyDef } from "../remotion/tech3d/types";
import {
  GeneratedAssemblyResult,
  normalizeGeneratedAssembly,
} from "./assembly-gen";

export class OmniRouteClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(baseURL?: string, apiKey?: string, defaultModel?: string) {
    const url =
      baseURL ||
      process.env.OMNIROUTE_BASE_URL ||
      "http://host.docker.internal:20128/v1";
    const key = apiKey || process.env.OMNIROUTE_API_KEY || "dummy-key";

    this.defaultModel =
      defaultModel || process.env.OMNIROUTE_MODEL || "ddgw/gpt-5.4-mini";

    this.client = new OpenAI({
      baseURL: url,
      apiKey: key,
    });
  }

  /**
   * Helper to clean markdown code fences and repair malformed JSON
   */
  /**
   * Robust JSON parser and repair for LLM completions
   */
  private cleanAndParseJson(raw: string): any {
    let clean = raw.trim();

    // Remove markdown code blocks if present
    if (clean.includes("```")) {
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        clean = match[1].trim();
      } else {
        clean = clean.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      }
    }

    // Isolate first '{' to last '}'
    const firstBrace = clean.indexOf("{");
    if (firstBrace !== -1) {
      const lastBrace = clean.lastIndexOf("}");
      if (lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
    }

    // Remove trailing commas before closing braces/brackets
    clean = clean.replace(/,\s*([\]}])/g, "$1");

    try {
      return JSON.parse(clean);
    } catch (e1) {
      // If truncated at the end, attempt emergency bracket balancing
      let repaired = clean;
      // Close open strings
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }
      // Count open braces and brackets
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;

      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

      repaired = repaired.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(repaired);
    }
  }

  /**
   * STAGE 1 Helper: Generate 3 search queries for SearXNG
   */
  async generateSearchQueries(
    topic: string,
    modelId?: string
  ): Promise<string[]> {
    const rawModel = modelId || this.defaultModel;
    const model = !rawModel || rawModel === "auto" ? "ddgw/gpt-5.4-mini" : rawModel;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: QUERY_GENERATOR_PROMPT },
          { role: "user", content: `Topic: ${topic}` },
        ],
        temperature: 0.3,
      });

      const text = completion.choices[0]?.message?.content || "[]";
      const parsed = this.cleanAndParseJson(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3).map((q) => String(q));
      }
    } catch (err) {
      console.warn("[OMNIROUTE] Query generation fallback:", err);
    }

    // Deterministic fallback queries based on topic
    return [
      `${topic} cara kerja penjelasan`,
      `${topic} fakta mengejutkan mekanisme`,
      `${topic} spesifikasi teknologi`,
    ];
  }

  /**
   * STAGE 2: Generate Master Storyboard with JSON schema validation & auto-retry
   */
  async generateStoryboard(
    topic: string,
    knowledgeBase: string,
    modelId?: string,
    maxRetries = 2
  ): Promise<Storyboard> {
    const model = modelId || this.defaultModel;

    let lastError: Error | null = null;
    const candidateModels = [
      !model || model === "auto" ? "ddgw/gpt-5.4-mini" : model,
      "groq/openai/gpt-oss-120b",
      "ddgw/gpt-5.4-mini",
    ];

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const compactKnowledge = knowledgeBase ? knowledgeBase.slice(0, 2500) : "";
        const userPrompt = `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${compactKnowledge}\n\nSTRICT DURATION DIRECTIVE:\n- The video MUST have EXACTLY 6 to 8 scenes.\n- Each scene narration must be 1 to 2 engaging spoken sentences (around 15-20 words) so each scene takes 5-7 seconds.\n- Total video duration MUST reach 45 to 60 seconds.\n\nGenerate the complete 6-to-8 scene storyboard JSON now with full mainVisual and cutaway for each scene.`;

        const modelToUse = candidateModels[Math.min(attempt - 1, candidateModels.length - 1)];
        const completion = await this.client.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: MASTER_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        });

        const rawText = completion.choices[0]?.message?.content || "";
        if (!rawText.trim()) {
          throw new Error("Model returned empty completion content");
        }
        const parsed = this.cleanAndParseJson(rawText);

        // Validate strictly using Zod schema
        const validated = StoryboardSchema.parse(parsed);
        return validated;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[OMNIROUTE] Storyboard generation attempt ${attempt} failed:`,
          err.message
        );
      }
    }

    throw new Error(
      `Failed to generate valid Storyboard after ${maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private describeError(err: any): string {
    return err instanceof ZodError
      ? err.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")
      : err.message;
  }

  /**
   * STAGE 2 (gaya "tech"): LLM memilih assembly + menulis beat narasi & kondisi objek.
   * Bila validasi gagal, pesan error dikirim balik ke LLM supaya ia memperbaiki
   * jawabannya sendiri (bukan sekadar mengulang prompt yang sama).
   */
  async generateTechStoryboard(
    topic: string,
    knowledgeBase: string,
    modelId?: string,
    opts: {
      catalog?: Record<string, AssemblyDef>;
      forceAssemblyId?: string;
      maxRetries?: number;
    } = {}
  ): Promise<TechStoryboard> {
    const catalog = opts.catalog ?? ASSEMBLIES;
    const maxRetries = opts.maxRetries ?? 2;
    const schema = makeTechStoryboardSchema(catalog, {
      forceAssemblyId: opts.forceAssemblyId,
    });
    const model = modelId || this.defaultModel;
    const modelToUse =
      !model || model === "auto" ? "ddgw/gpt-5.4-mini" : model;

    const userPrompt = `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nDIREKTIF DURASI:\n- 6 sampai 8 beat.\n- Narasi tiap beat 1-2 kalimat (sekitar 14-22 kata) sehingga tiap beat 5-8 detik dan total video 45-60 detik.\n\n${
      opts.forceAssemblyId
        ? `Gunakan assembly "${opts.forceAssemblyId}" dan tulis JSON-nya sekarang.`
        : 'Pilih assembly dari katalog (atau NONE bila tidak cocok), lalu tulis JSON-nya sekarang.'
    }`;

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system",
        content: buildTechDirectorPrompt(catalog, {
          forceAssemblyId: opts.forceAssemblyId,
        }),
      },
      { role: "user", content: userPrompt },
    ];

    let lastError = "";
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      let rawText = "";
      try {
        const completion = await this.client.chat.completions.create({
          model: modelToUse,
          messages,
          temperature: 0.5,
          max_tokens: 4096,
        });
        rawText = completion.choices[0]?.message?.content || "";
        if (!rawText.trim()) throw new Error("Model returned empty completion content");

        return schema.parse(this.cleanAndParseJson(rawText));
      } catch (err: any) {
        lastError = this.describeError(err);
        console.warn(
          `[OMNIROUTE] Tech storyboard attempt ${attempt} failed: ${lastError}`
        );
        if (rawText.trim()) {
          messages.push({ role: "assistant", content: rawText });
          messages.push({
            role: "user",
            content: `JSON tadi ditolak validator: ${lastError}\nPerbaiki dan kirim ulang HANYA JSON yang valid.`,
          });
        }
      }
    }

    throw new Error(
      `Failed to generate valid tech storyboard after ${maxRetries + 1} attempts: ${lastError}`
    );
  }

  /**
   * STAGE 2b: tidak ada assembly yang cocok -> LLM merancang assembly baru dari library part.
   * Hasilnya divalidasi & dinormalisasi (batas ukuran, skala, layout exploded otomatis);
   * bila ditolak, pesan error dikirim balik ke LLM untuk diperbaiki.
   */
  async generateAssembly(
    topic: string,
    knowledgeBase: string,
    fitReason: string,
    takenIds: string[],
    modelId?: string,
    maxRetries = 2
  ): Promise<GeneratedAssemblyResult> {
    const model = modelId || this.defaultModel;
    const modelToUse =
      !model || model === "auto" ? "ddgw/gpt-5.4-mini" : model;

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: buildAssemblyDesignerPrompt() },
      {
        role: "user",
        content: `TOPIC: ${topic}\n\nKenapa tidak ada assembly di katalog yang cocok: ${fitReason || "-"}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nRancang assembly yang paling menjelaskan topik ini dan kirim JSON-nya sekarang.`,
      },
    ];

    let lastError = "";
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      let rawText = "";
      try {
        const completion = await this.client.chat.completions.create({
          model: modelToUse,
          messages,
          temperature: 0.4,
          max_tokens: 4096,
        });
        rawText = completion.choices[0]?.message?.content || "";
        if (!rawText.trim()) throw new Error("Model returned empty completion content");

        return normalizeGeneratedAssembly(this.cleanAndParseJson(rawText), takenIds);
      } catch (err: any) {
        lastError = this.describeError(err);
        console.warn(
          `[OMNIROUTE] Assembly design attempt ${attempt} failed: ${lastError}`
        );
        if (rawText.trim()) {
          messages.push({ role: "assistant", content: rawText });
          messages.push({
            role: "user",
            content: `JSON tadi ditolak validator: ${lastError}\nPerbaiki dan kirim ulang HANYA JSON yang valid.`,
          });
        }
      }
    }

    throw new Error(
      `Failed to design a new assembly after ${maxRetries + 1} attempts: ${lastError}`
    );
  }
}

export const omniroute = new OmniRouteClient();
