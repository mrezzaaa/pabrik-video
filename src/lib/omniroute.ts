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
      timeout: 90_000,
      maxRetries: 0, // We handle retries manually with model cascade + self-correction
      dangerouslyAllowBrowser: true,
    });
  }
  return _omnirouteClient;
}

const MODEL_FALLBACK_CASCADE = [
  env.OMNIROUTE_PRIMARY_MODEL,
  env.OMNIROUTE_FAST_MODEL,
  "auto",
  "cloudflare-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
];

/**
 * Extracts the first complete JSON object from raw LLM output.
 * Handles:
 *  - <think>...</think> reasoning blocks (DeepSeek, QwQ)
 *  - ```json ... ``` markdown fences
 *  - Leading/trailing prose before/after the JSON
 *  - Trailing commas before } or ] (common LLM slip)
 */
export function extractJsonFromText(raw: string): unknown {
  // 1. Strip <think>...</think> reasoning traces
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Strip ```json fences
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // 3. Find outer JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(`No JSON object boundary found in LLM output (${raw.length} chars): "${raw.slice(0, 200)}"`);
  }
  let jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);

  // 4. Fix trailing commas before } or ] (common LLM mistakes)
  jsonSlice = jsonSlice.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonSlice);
}

/**
 * Dynamically generates topic-specific structured JSON via Omniroute LLM.
 * - Uses json_object response format when possible.
 * - Strips <think> blocks and markdown fences.
 * - Feeds Zod validation errors back to the LLM for self-correction (up to 2 retries per model).
 * - Logs raw LLM output to console for debugging.
 * - NEVER falls back to hardcoded mock topics — throws a visible error if all LLM attempts fail.
 */
export async function generateStructuredOmniroute<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, any, any>;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ data: T; modelUsed: string }> {
  const {
    systemPrompt,
    userPrompt,
    schema,
    preferredModel,
    temperature = 0.25,
    maxTokens = 8000,
  } = params;

  const modelsToTry = Array.from(
    new Set(
      [preferredModel, ...MODEL_FALLBACK_CASCADE].filter((m): m is string =>
        Boolean(m && m.trim())
      )
    )
  );

  const errors: string[] = [];

  for (const model of modelsToTry) {
    let promptAttempt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    for (let retry = 0; retry < 3; retry++) {
      try {
        const requestBody = {
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: "user" as const, content: promptAttempt }],
          // Use json_object mode — the most widely supported structured output mode.
          // Do NOT use json_schema (strict) as local/proxied models often reject it.
          response_format: { type: "json_object" as const },
          stream: false as const,
        };

        const response = await getOmnirouteClient().chat.completions.create(requestBody);

        const msg = response.choices?.[0]?.message;
        const rawContent = (
          msg?.content ||
          (msg as unknown as { reasoning_content?: string })?.reasoning_content ||
          ""
        ).trim();

        // Always log raw output for debugging in terminal
        console.log(`[OMNIROUTE RAW] model=${model} attempt=${retry + 1} len=${rawContent.length}:`, rawContent.slice(0, 600));

        if (!rawContent) {
          throw new Error(`Empty response content from model ${model}`);
        }

        const parsedJson = extractJsonFromText(rawContent);
        const validated = schema.parse(parsedJson);
        return { data: validated, modelUsed: model };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push(`[${model}#${retry + 1}]: ${errMessage}`);
        console.warn(`[Omniroute] Model ${model} (attempt ${retry + 1}) FAILED:`, errMessage);

        // Self-correction: feed exact validation error back to the LLM
        promptAttempt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\n⚠️ CRITICAL: Your previous JSON response was REJECTED with this validation error:\n${errMessage}\n\nFix ALL schema issues and return ONLY valid JSON. Do NOT add markdown fences or <think> blocks. Start directly with { and end with }.`;
      }
    }
  }

  throw new Error(
    `Omniroute LLM failed to generate valid JSON after trying [${modelsToTry.join(", ")}]:\n${errors.join("\n")}`
  );
}
