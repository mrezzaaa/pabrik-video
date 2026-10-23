import OpenAI from "openai";
import { type ZodType } from "zod";
import { env } from "@/config/env";

/**
 * OpenAI-compatible SDK client configured for Omniroute Gateway (http://localhost:20128/v1)
 */
let _omnirouteClient: OpenAI | null = null;

export function getOmnirouteClient(): OpenAI {
  if (!_omnirouteClient) {
    _omnirouteClient = new OpenAI({
      baseURL: env.OMNIROUTE_BASE_URL,
      apiKey: env.OMNIROUTE_API_KEY,
      timeout: 45_000,
      maxRetries: 2,
      dangerouslyAllowBrowser: true,
    });
  }
  return _omnirouteClient;
}

const MODEL_FALLBACK_CASCADE = [
  env.OMNIROUTE_PRIMARY_MODEL,
  env.OMNIROUTE_FAST_MODEL,
  "kr/claude-sonnet-4.5",
  "kr/claude-haiku-4.5",
  "agy/gemini-3-flash",
];

export function extractJsonFromText(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object boundary found in LLM output");
  }
  const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSlice);
}

export async function generateStructuredOmniroute<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, any, any>;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackGenerator?: () => T;
}): Promise<{ data: T; modelUsed: string }> {
  const {
    systemPrompt,
    userPrompt,
    schema,
    preferredModel,
    temperature = 0.25,
    maxTokens = 6000,
    fallbackGenerator,
  } = params;

  const modelsToTry = Array.from(
    new Set([preferredModel, ...MODEL_FALLBACK_CASCADE].filter((m): m is string => Boolean(m && m.trim())))
  );

  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
      const response = await getOmnirouteClient().chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "user", content: combinedPrompt },
        ],
      });

      const msg = response.choices?.[0]?.message;
      const rawContent = (msg?.content || (msg as unknown as { reasoning_content?: string })?.reasoning_content || "").trim();

      if (!rawContent) {
        throw new Error(`Empty response content from model ${model}`);
      }

      const parsedJson = extractJsonFromText(rawContent);
      const validated = schema.parse(parsedJson);
      return { data: validated, modelUsed: model };
    } catch (err) {
      lastError = err;
      console.warn(`[Omniroute] Model ${model} attempt failed:`, err instanceof Error ? err.message : String(err));
    }
  }

  if (fallbackGenerator) {
    console.warn("[Omniroute] All LLM models failed or timed out; using deterministic engineering fallback blueprint.");
    return {
      data: fallbackGenerator(),
      modelUsed: "deterministic-engineering-fallback",
    };
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate structured output from Omniroute gateway");
}
