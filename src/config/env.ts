import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Redis & BullMQ
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // Omniroute OpenAI-compatible Gateway
  OMNIROUTE_BASE_URL: z.string().url().default("http://localhost:20128/v1"),
  OMNIROUTE_API_KEY: z.string().min(1).default("free-key"),
  OMNIROUTE_PRIMARY_MODEL: z.string().default("antigravity/claude-sonnet-4-6"),
  OMNIROUTE_FAST_MODEL: z.string().default("antigravity/gemini-3.8-flash-high"),

  // UnlimitedTTS Settings
  UNLIMITEDTTS_LANGUAGE: z.string().default("id-ID"),
  UNLIMITEDTTS_VOICE: z.string().default("Ethan"),
  UNLIMITEDTTS_SPEED: z.coerce.number().min(0.5).max(2.0).default(1.1),

  // Remotion Settings
  REMOTION_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  REMOTION_FPS: z.coerce.number().int().default(60),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  if (typeof process !== "undefined" && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      try {
        process.loadEnvFile(".env");
      } catch {
        // Files may not exist in container/production, fallback to process.env
      }
    }
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    OMNIROUTE_BASE_URL: process.env.OMNIROUTE_BASE_URL || process.env.OMNIROUTE_URL,
    OMNIROUTE_API_KEY: process.env.OMNIROUTE_API_KEY || process.env.OPENAI_API_KEY,
    OMNIROUTE_PRIMARY_MODEL: process.env.OMNIROUTE_PRIMARY_MODEL,
    OMNIROUTE_FAST_MODEL: process.env.OMNIROUTE_FAST_MODEL,
    UNLIMITEDTTS_LANGUAGE: process.env.UNLIMITEDTTS_LANGUAGE || process.env.UNLIMITEDTTS_LANG,
    UNLIMITEDTTS_VOICE: process.env.UNLIMITEDTTS_VOICE,
    UNLIMITEDTTS_SPEED: process.env.UNLIMITEDTTS_SPEED,
    REMOTION_CONCURRENCY: process.env.REMOTION_CONCURRENCY,
    REMOTION_FPS: process.env.REMOTION_FPS,
  });

  if (!parsed.success) {
    console.warn("[env] Environment validation warning, using defaults:", parsed.error.flatten().fieldErrors);
    return envSchema.parse({});
  }

  return parsed.data;
}

export const env = parseEnv();
