import OpenAI from "openai";
import { z } from "zod";
import { env } from "./env";

type ModelTier = "primary" | "fast";

export type ChatJSONOptions<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  tier?: ModelTier;
  temperature?: number;
  maxTokens?: number;
  /** Extra attempt with a lower temperature if the first answer is not valid JSON. */
  retries?: number;
};

const globalForOpenAI = globalThis as unknown as {
  omnirouteClient: OpenAI | undefined;
};

export function getOmnirouteClient() {
  if (!globalForOpenAI.omnirouteClient) {
    globalForOpenAI.omnirouteClient = new OpenAI({
      baseURL: env.omnirouteBaseUrl,
      apiKey: env.omnirouteApiKey,
      timeout: 180_000,
      maxRetries: 0,
    });
  }
  return globalForOpenAI.omnirouteClient;
}

function modelFor(tier: ModelTier) {
  return tier === "fast" ? env.fastModel : env.primaryModel;
}

export function extractJsonObject(raw: string): unknown {
  let text = raw.trim();

  // Some local models wrap the answer in markdown or reasoning tags.
  text = text
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("LLM tidak mengembalikan objek JSON.");
  }

  const candidate = text.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // Common local-model mistakes: trailing commas.
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
  }
}

export async function chatJSON<T>({
  system,
  user,
  schema,
  tier = "primary",
  temperature = 0.75,
  maxTokens = 3200,
  retries = 2,
}: ChatJSONOptions<T>): Promise<T> {
  const client = getOmnirouteClient();
  const model = modelFor(tier);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: attempt === 0 ? temperature : 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              attempt === 0
                ? user
                : `${user}\n\nPENTING: jawab HANYA dengan satu objek JSON valid, tanpa penjelasan, tanpa markdown.`,
          },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("LLM mengembalikan jawaban kosong.");
      }

      const parsed = extractJsonObject(content);
      return schema.parse(parsed);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 800 * (attempt + 1)),
        );
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Omniroute gagal setelah ${retries + 1} percobaan: ${message}`);
}

export async function chatText(options: {
  system: string;
  user: string;
  tier?: ModelTier;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const client = getOmnirouteClient();
  const completion = await client.chat.completions.create({
    model: modelFor(options.tier ?? "primary"),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM mengembalikan jawaban kosong.");
  }
  return content;
}

export async function listOmnirouteModels() {
  const client = getOmnirouteClient();
  const response = await client.models.list();
  return response.data.map((model) => ({
    id: model.id,
    ownedBy: model.owned_by,
  }));
}
