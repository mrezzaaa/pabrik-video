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
      timeout: 60_000,
      maxRetries: 2,
      dangerouslyAllowBrowser: true,
    });
  }
  return _omnirouteClient;
}

const MODEL_FALLBACK_CASCADE = [
  env.OMNIROUTE_PRIMARY_MODEL,
  env.OMNIROUTE_FAST_MODEL,
  "antigravity/claude-sonnet-4-6",
  "antigravity/gemini-3.8-flash-high",
  "antigravity/gemini-3-flash",
  "cloudflare-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
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

/**
 * Dynamically generates topic-specific structured JSON via Omniroute LLM.
 * If a model returns a validation error, feeds the Zod error back to the LLM to self-correct.
 * NEVER falls back to hardcoded mock topics—throws a visible error if all LLM attempts fail.
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
    maxTokens = 6000,
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

    for (let retry = 0; retry < 2; retry++) {
      try {
        const response = await getOmnirouteClient().chat.completions.create({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: promptAttempt }],
        });

        const msg = response.choices?.[0]?.message;
        const rawContent = (
          msg?.content ||
          (msg as unknown as { reasoning_content?: string })?.reasoning_content ||
          ""
        ).trim();

        if (!rawContent) {
          throw new Error(`Empty response content from model ${model}`);
        }

        const parsedJson = extractJsonFromText(rawContent);
        const validated = schema.parse(parsedJson);
        return { data: validated, modelUsed: model };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push(`[${model}#${retry + 1}]: ${errMessage}`);
        console.warn(`[Omniroute] Model ${model} (attempt ${retry + 1}) failed:`, errMessage);

        promptAttempt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\nIMPORTANT: Your previous JSON response failed validation with this error:\n${errMessage}\nFix ALL schema issues and return ONLY valid JSON.`;
      }
    }
  }

  throw new Error(
    `Omniroute LLM failed to generate valid JSON after trying [${modelsToTry.join(", ")}]:\n${errors.join("\n")}`
  );
}
