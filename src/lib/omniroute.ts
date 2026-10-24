import OpenAI from "openai";
import { MASTER_SYSTEM_PROMPT, QUERY_GENERATOR_PROMPT } from "./prompts";
import { Storyboard, StoryboardSchema } from "./types";

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
      defaultModel || process.env.OMNIROUTE_MODEL || "groq/openai/gpt-oss-120b";

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
    const model = !rawModel || rawModel === "auto" ? "groq/openai/gpt-oss-120b" : rawModel;

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
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const userPrompt = `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE:\n${knowledgeBase}\n\nSTRICT DURATION DIRECTIVE:\n- The video MUST have EXACTLY 7 to 9 scenes.\n- Each scene narration must be 2 to 3 engaging spoken sentences (around 15-20 words) so each scene takes 5-7 seconds.\n- Total video duration MUST reach 45 to 60 seconds (NOT a short 2-scene summary!).\n\nGenerate the complete 7-to-9 scene storyboard JSON now with full mainVisual and cutaway for each scene.`;

        const modelToUse = !model || model === "auto" ? "groq/openai/gpt-oss-120b" : model;
        const completion = await this.client.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: MASTER_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
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
