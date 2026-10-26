import OpenAI from "openai";
import { MASTER_SYSTEM_PROMPT, QUERY_GENERATOR_PROMPT } from "./prompts";
import { Storyboard, StoryboardSchema } from "./types";

export class OmniRouteClient {
  private client: OpenAI;
  private defaultModel: string;
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL?: string, apiKey?: string, defaultModel?: string) {
    this.baseURL =
      baseURL ||
      process.env.OMNIROUTE_BASE_URL ||
      "http://localhost:20128/v1";
    this.apiKey = apiKey || process.env.OMNIROUTE_API_KEY || "dummy-key";

    this.defaultModel =
      defaultModel || process.env.OMNIROUTE_MODEL || "ddgw/gpt-5.4-mini";

    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
    });
  }

  public async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      const models: string[] = [];
      for await (const m of response) {
        if (m.id) models.push(m.id);
      }
      if (models.length > 0) {
        return models.sort();
      }
    } catch (err: any) {
      console.warn("[OMNIROUTE] SDK models.list() failed, trying direct HTTP fetch:", err.message);
    }

    try {
      const url = `${this.baseURL}/models`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
        if (models.length > 0) return models.sort();
      }
    } catch (e: any) {
      console.error("[OMNIROUTE] HTTP fetch models failed:", e.message);
    }

    return [
      "groq/openai/gpt-oss-120b",
      "groq/openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "ddgw/gpt-5.4-mini",
      "zc/glm-5.3-flash",
      "auto",
    ];
  }

  /**
   * Helper to clean markdown code fences and repair malformed JSON
   */
  /**
   * Robust JSON parser and repair for LLM completions
   */
  public cleanAndParseJson(raw: string): any {
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
   * Helper to execute chat completions with default fast model
   */
  async getChatCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    modelId?: string,
    temperature = 0.4,
    maxTokens = 4096
  ): Promise<string> {
    const rawModel = modelId || this.defaultModel;
    const model = !rawModel || rawModel === "auto" ? "ddgw/gpt-5.4-mini" : rawModel;
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content || "";
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
}

export const omniroute = new OmniRouteClient();

/**
 * Content-model resolver: blueprint/script generation needs a model with strong
 * structured-JSON output. Never silently fall back to a weak "auto" route.
 *
 * Priority: explicit override -> OMNIROUTE_CONTENT_MODEL -> qwen/qwen3.8-27b.
 *
 * Why not GLM today: every "zc/glm-5.3-flash" route on the local OmniRoute is
 * down with "502 spawn zcode ENOENT", and "auto/glm" (cf/zai-org/glm-4.7-flash)
 * returns a reasoning_content payload with raw newlines, i.e. invalid JSON.
 * As soon as a GLM route answers with clean JSON, run:
 *   OMNIROUTE_CONTENT_MODEL=zc/glm-5.3-flash
 */
export function resolveContentModel(override?: string): string {
  const candidates = [override, process.env.OMNIROUTE_CONTENT_MODEL];
  for (const candidate of candidates) {
    const value = (candidate || "").trim();
    if (value && value !== "auto") return value;
  }
  return "qwen/qwen3.8-27b";
}
