import OpenAI from "openai";
import { z } from "zod";
import { env } from "./env";
import { stripEmoji } from "./text";

type ModelTier = "primary" | "fast";

export type ChatJSONOptions<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  tier?: ModelTier;
  modelOverride?: string | null;
  temperature?: number;
  maxTokens?: number;
  /** Extra attempt with a lower temperature if the first answer is not valid JSON. */
  retries?: number;
};

let activeOmnirouteBaseUrl: string | null = null;

const globalForOpenAI = globalThis as unknown as {
  omnirouteClient: OpenAI | undefined;
  omnirouteBaseUrl: string | undefined;
};

export function getCandidateBaseUrls(): string[] {
  const configured = env.omnirouteBaseUrl;
  const urls: string[] = [];

  if (activeOmnirouteBaseUrl) {
    urls.push(activeOmnirouteBaseUrl);
  }

  urls.push(configured);

  if (configured.includes("host.docker.internal")) {
    urls.push(configured.replace("host.docker.internal", "127.0.0.1"));
    urls.push(configured.replace("host.docker.internal", "localhost"));
  } else if (
    configured.includes("localhost") ||
    configured.includes("127.0.0.1")
  ) {
    urls.push(
      configured.replace(/localhost|127\.0\.0\.1/, "host.docker.internal"),
    );
  }

  return [...new Set(urls)];
}

export function createOmnirouteClient(baseURL: string) {
  return new OpenAI({
    baseURL,
    apiKey: env.omnirouteApiKey,
    timeout: 180_000,
    maxRetries: 0,
  });
}

export function getOmnirouteClient() {
  const target = activeOmnirouteBaseUrl || env.omnirouteBaseUrl;
  if (
    !globalForOpenAI.omnirouteClient ||
    globalForOpenAI.omnirouteBaseUrl !== target
  ) {
    globalForOpenAI.omnirouteBaseUrl = target;
    globalForOpenAI.omnirouteClient = createOmnirouteClient(target);
  }
  return globalForOpenAI.omnirouteClient;
}

function modelFor(tier: ModelTier) {
  return tier === "fast" ? env.fastModel : env.primaryModel;
}

function recursivelyStripEmojis(val: unknown): unknown {
  if (typeof val === "string") return stripEmoji(val);
  if (Array.isArray(val)) return val.map(recursivelyStripEmojis);
  if (val && typeof val === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = recursivelyStripEmojis(v);
    }
    return res;
  }
  return val;
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // Common local-model mistakes: trailing commas.
    parsed = JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
  }

  return recursivelyStripEmojis(parsed);
}

export async function chatJSON<T>({
  system,
  user,
  schema,
  tier = "primary",
  modelOverride,
  temperature = 0.75,
  maxTokens = 3200,
  retries = 2,
}: ChatJSONOptions<T>): Promise<T> {
  const candidateUrls = getCandidateBaseUrls();
  const model = modelOverride?.trim() || modelFor(tier);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const baseUrl = candidateUrls[attempt % candidateUrls.length] || candidateUrls[0];
    const client = createOmnirouteClient(baseUrl);
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

      activeOmnirouteBaseUrl = baseUrl;
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
  modelOverride?: string | null;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const candidateUrls = getCandidateBaseUrls();
  const model =
    options.modelOverride?.trim() || modelFor(options.tier ?? "primary");
  let lastError: unknown;

  for (const baseUrl of candidateUrls) {
    try {
      const client = createOmnirouteClient(baseUrl);
      const completion = await client.chat.completions.create({
        model,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      });

      activeOmnirouteBaseUrl = baseUrl;
      const content = completion.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("LLM mengembalikan jawaban kosong.");
      }
      return content;
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Omniroute gagal: ${message}`);
}

export async function listOmnirouteModels() {
  const candidateUrls = getCandidateBaseUrls();
  let lastError: unknown;

  for (const baseUrl of candidateUrls) {
    try {
      const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: env.omnirouteApiKey,
        timeout: 10_000,
        maxRetries: 0,
      });
      const response = await client.models.list();
      activeOmnirouteBaseUrl = baseUrl;
      return response.data.map((model) => ({
        id: model.id,
        ownedBy: model.owned_by,
      }));
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("[omniroute] Gagal mengambil daftar model:", lastError);
  return [];
}
