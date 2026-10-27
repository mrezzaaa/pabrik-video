function required(name: string, fallback: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: required("NEXT_PUBLIC_APP_URL", "http://localhost:2000"),

  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://pabrik:pabrik_secret@localhost:5433/pabrik_video?schema=public",
  ),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  searxngUrl: required("SEARXNG_URL", "http://localhost:8080").replace(
    /\/$/,
    "",
  ),

  omnirouteBaseUrl: required(
    "OMNIROUTE_BASE_URL",
    "http://localhost:20128/v1",
  ).replace(/\/$/, ""),
  omnirouteApiKey: required("OMNIROUTE_API_KEY", "local"),
  primaryModel: required("OMNIROUTE_PRIMARY_MODEL", "auto"),
  fastModel: required("OMNIROUTE_FAST_MODEL", "auto"),

  voiceDefaultId: required("VOICE_DEFAULT_ID", "alloy"),
  voiceName: required("VOICESTUDIO_VOICE_NAME", "Alloy"),
  voiceStudioBaseUrl: required(
    "VOICESTUDIO_BASE_URL",
    "http://localhost:3900/v1",
  ).replace(/\/$/, ""),
  voiceStudioModel: required("VOICESTUDIO_MODEL", "omnivoice"),
  voiceStudioApiKey: process.env.VOICESTUDIO_API_KEY ?? "",
  voiceStudioSpeed: Number(process.env.VOICESTUDIO_SPEED ?? 1.05),

  unlimitedTtsLanguage: required("UNLIMITEDTTS_LANGUAGE", "id-ID"),
  unlimitedTtsVoice: required("UNLIMITEDTTS_VOICE", "Ethan"),
  unlimitedTtsSpeed: Number(process.env.UNLIMITEDTTS_SPEED ?? 1.1),

  remotionConcurrency: Number(process.env.REMOTION_CONCURRENCY ?? 2),
  remotionFps: Number(process.env.REMOTION_FPS ?? 30),
  remotionGl: process.env.REMOTION_GL ?? "angle",

  queueName: "pabrik-video-queue",
} as const;

export function assertServerEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.REDIS_URL) missing.push("REDIS_URL");
  return missing;
}
